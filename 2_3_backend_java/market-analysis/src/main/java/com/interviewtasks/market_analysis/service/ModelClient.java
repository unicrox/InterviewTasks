package com.interviewtasks.market_analysis.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewtasks.market_analysis.dto.WhatIfRequest;
import com.interviewtasks.market_analysis.dto.WhatIfResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ModelClient {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String modelApiUrl;

    // -- Spring injects model.api.url, then the trailing slash is removed so endpoint paths join cleanly.
    public ModelClient(@Value("${model.api.url}") String modelApiUrl) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.modelApiUrl = modelApiUrl.replaceAll("/$", "");
    }

    // -- Send the what-if property features to the Python model API and return its predicted price.
    public WhatIfResponse predict(WhatIfRequest request) {
        // -- The Python model expects snake_case JSON field names, while the Java DTO uses camelCase methods.
        String modelPayload = """
                {
                  "square_footage": %s,
                  "bedrooms": %s,
                  "bathrooms": %s,
                  "year_built": %s,
                  "lot_size": %s,
                  "distance_to_city_center": %s,
                  "school_rating": %s
                }
                """.formatted(
                request.squareFootage(),
                request.bedrooms(),
                request.bathrooms(),
                request.yearBuilt(),
                request.lotSize(),
                request.distanceToCityCenter(),
                request.schoolRating());

        // -- Build a POST request to /predict with JSON headers and a UTF-8 request body.
        HttpRequest modelRequest = HttpRequest.newBuilder()
                .uri(URI.create(modelApiUrl + "/predict"))
                .version(HttpClient.Version.HTTP_1_1)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofByteArray(modelPayload.getBytes(StandardCharsets.UTF_8)))
                .build();

        try {
            // -- This call blocks until the model API responds with the prediction result.
            HttpResponse<String> response = httpClient.send(
                    modelRequest,
                    HttpResponse.BodyHandlers.ofString());

            // -- Non-2xx responses mean the Java backend could reach the model API, but prediction failed there.
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Model API prediction failed: " + response.body());
            }

            // -- The model API returns an array named predictions; this endpoint only uses the first value.
            JsonNode predictions = objectMapper.readTree(response.body()).path("predictions");

            // -- Treat a missing or empty predictions array as a bad upstream model response.
            if (!predictions.isArray() || predictions.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Model API returned no prediction");
            }

            return new WhatIfResponse(predictions.get(0).asDouble(), "predicted");
        } catch (IOException exception) {
            // -- IOException covers connection problems and JSON parsing failures while reading the response.
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Failed to read model API response",
                    exception);
        } catch (InterruptedException exception) {
            // -- Restore the interrupted flag so the server thread keeps the interruption signal.
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Model API request was interrupted",
                    exception);
        }
    }
}
