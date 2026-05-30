package com.interviewtasks.market_analysis.dto;

public record MarketSummaryResponse(
        int totalProperties,
        double averagePrice,
        double minimumPrice,
        double maximumPrice,
        double averageSquareFootage) {
}
