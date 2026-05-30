package com.interviewtasks.market_analysis.service;

import com.interviewtasks.market_analysis.dto.PropertyResponse;
import com.interviewtasks.market_analysis.dto.MarketSummaryResponse;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MarketDataService {

    private final Path dataPath;

    // -- Spring injects market.data.path from application.properties so the CSV path is configurable.
    public MarketDataService(@Value("${market.data.path}") String dataPath) {
        this.dataPath = Path.of(dataPath);
    }

    // -- Return the market rows after optional filters and sorting have been applied.
    @Cacheable("marketProperties")
    public List<PropertyResponse> findProperties(
            Integer bedrooms,
            Double minPrice,
            Double maxPrice,
            String sortBy,
            String sortDirection) {
        // -- Comparator tells Java which property field should control the list order.
        Comparator<PropertyResponse> comparator = propertyComparator(sortBy);

        // -- Reverse the comparator only when the caller asks for descending order.
        if ("desc".equalsIgnoreCase(sortDirection)) {
            comparator = comparator.reversed();
        } else if (!"asc".equalsIgnoreCase(sortDirection)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "sortDirection must be asc or desc");
        }

        // -- Null filter values mean "do not filter by this field".
        return loadProperties().stream()
                .filter(property -> bedrooms == null || property.bedrooms() == bedrooms)
                .filter(property -> minPrice == null || property.price() >= minPrice)
                .filter(property -> maxPrice == null || property.price() <= maxPrice)
                .sorted(comparator)
                .toList();
    }

    // -- Aggregate stats power the dashboard summary cards.
    @Cacheable("marketSummary")
    public MarketSummaryResponse getSummary() {
        List<PropertyResponse> properties = loadProperties();

        if (properties.isEmpty()) {
            return new MarketSummaryResponse(0, 0, 0, 0, 0);
        }

        double averagePrice = properties.stream()
                .mapToDouble(PropertyResponse::price)
                .average()
                .orElse(0);
        double minimumPrice = properties.stream()
                .mapToDouble(PropertyResponse::price)
                .min()
                .orElse(0);
        double maximumPrice = properties.stream()
                .mapToDouble(PropertyResponse::price)
                .max()
                .orElse(0);
        double averageSquareFootage = properties.stream()
                .mapToDouble(PropertyResponse::squareFootage)
                .average()
                .orElse(0);

        return new MarketSummaryResponse(
                properties.size(),
                averagePrice,
                minimumPrice,
                maximumPrice,
                averageSquareFootage);
    }

    public List<PropertyResponse> loadProperties() {
        try {
            // -- Read the supplied housing dataset, then skip the CSV header row.
            List<String> lines = Files.readAllLines(dataPath);

            return lines.stream()
                    .skip(1)
                    .filter(line -> !line.isBlank())
                    .map(this::parseProperty)
                    .toList();
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to read market data file",
                    exception);
        }
    }

    public String exportCsv() {
        StringBuilder csv = new StringBuilder(
                "id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance_to_city_center,school_rating,price\n");

        for (PropertyResponse property : loadProperties()) {
            csv.append(property.id()).append(",")
                    .append(property.squareFootage()).append(",")
                    .append(property.bedrooms()).append(",")
                    .append(property.bathrooms()).append(",")
                    .append(property.yearBuilt()).append(",")
                    .append(property.lotSize()).append(",")
                    .append(property.distanceToCityCenter()).append(",")
                    .append(property.schoolRating()).append(",")
                    .append(property.price()).append("\n");
        }

        return csv.toString();
    }

    public byte[] exportPdf() {
        MarketSummaryResponse summary = getSummary();
        List<String> lines = List.of(
                "Property Market Analysis Report",
                "Total properties: " + summary.totalProperties(),
                "Average price: $" + Math.round(summary.averagePrice()),
                "Minimum price: $" + Math.round(summary.minimumPrice()),
                "Maximum price: $" + Math.round(summary.maximumPrice()),
                "Average square footage: " + Math.round(summary.averageSquareFootage()) + " sq ft");

        StringBuilder content = new StringBuilder("BT\n/F1 16 Tf\n72 760 Td\n");
        for (int index = 0; index < lines.size(); index++) {
            if (index == 1) {
                content.append("/F1 12 Tf\n");
            }
            if (index > 0) {
                content.append("0 -24 Td\n");
            }
            content.append("(").append(escapePdfText(lines.get(index))).append(") Tj\n");
        }
        content.append("ET\n");

        List<String> objects = List.of(
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
                "<< /Length " + content.length() + " >>\nstream\n" + content + "endstream");

        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();

        for (int index = 0; index < objects.size(); index++) {
            offsets.add(pdf.length());
            pdf.append(index + 1).append(" 0 obj\n")
                    .append(objects.get(index)).append("\n")
                    .append("endobj\n");
        }

        int xrefOffset = pdf.length();
        pdf.append("xref\n0 ").append(objects.size() + 1).append("\n")
                .append("0000000000 65535 f \n");
        for (Integer offset : offsets) {
            pdf.append(String.format(Locale.ROOT, "%010d 00000 n \n", offset));
        }
        pdf.append("trailer\n<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\n")
                .append("startxref\n").append(xrefOffset).append("\n%%EOF\n");

        return pdf.toString().getBytes(StandardCharsets.US_ASCII);
    }

    private String escapePdfText(String value) {
        return value.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)");
    }

    private PropertyResponse parseProperty(String line) {
        // -- The dataset is a simple comma-separated file with nine expected columns.
        String[] columns = line.split(",", -1);

        if (columns.length != 9) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Market data row has an unexpected column count");
        }

        return new PropertyResponse(
                Integer.parseInt(columns[0]),
                Double.parseDouble(columns[1]),
                Integer.parseInt(columns[2]),
                Double.parseDouble(columns[3]),
                Integer.parseInt(columns[4]),
                Double.parseDouble(columns[5]),
                Double.parseDouble(columns[6]),
                Double.parseDouble(columns[7]),
                Double.parseDouble(columns[8]));
    }

    private Comparator<PropertyResponse> propertyComparator(String sortBy) {
        // -- Default sorting is by id; lowercase lets callers use either price or PRICE.
        String normalizedSortBy = sortBy == null || sortBy.isBlank()
                ? "id"
                : sortBy.toLowerCase(Locale.ROOT);

        // -- Each switch case maps a sortBy query value to the matching record field.
        return switch (normalizedSortBy) {
            case "id" -> Comparator.comparingInt(PropertyResponse::id);
            case "squarefootage", "square_footage" -> Comparator.comparingDouble(PropertyResponse::squareFootage);
            case "bedrooms" -> Comparator.comparingInt(PropertyResponse::bedrooms);
            case "bathrooms" -> Comparator.comparingDouble(PropertyResponse::bathrooms);
            case "yearbuilt", "year_built" -> Comparator.comparingInt(PropertyResponse::yearBuilt);
            case "lotsize", "lot_size" -> Comparator.comparingDouble(PropertyResponse::lotSize);
            case "distancetocitycenter", "distance_to_city_center" ->
                    Comparator.comparingDouble(PropertyResponse::distanceToCityCenter);
            case "schoolrating", "school_rating" -> Comparator.comparingDouble(PropertyResponse::schoolRating);
            case "price" -> Comparator.comparingDouble(PropertyResponse::price);
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported sortBy value: " + sortBy);
        };
    }
}
