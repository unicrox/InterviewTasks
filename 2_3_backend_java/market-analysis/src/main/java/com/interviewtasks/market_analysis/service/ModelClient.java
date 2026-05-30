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

    public ModelClient(@Value("${model.api.url}") String modelApiUrl) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.modelApiUrl = modelApiUrl.replaceAll("/$", "");
    }

    public WhatIfResponse predict(WhatIfRequest request) {
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

        HttpRequest modelRequest = HttpRequest.newBuilder()
                .uri(URI.create(modelApiUrl + "/predict"))
                .version(HttpClient.Version.HTTP_1_1)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofByteArray(modelPayload.getBytes(StandardCharsets.UTF_8)))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    modelRequest,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Model API prediction failed: " + response.body());
            }

            JsonNode predictions = objectMapper.readTree(response.body()).path("predictions");

            if (!predictions.isArray() || predictions.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Model API returned no prediction");
            }

            return new WhatIfResponse(predictions.get(0).asDouble(), "predicted");
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Failed to read model API response",
                    exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Model API request was interrupted",
                    exception);
        }
    }
}
