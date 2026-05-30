package com.interviewtasks.market_analysis.dto;

public record PropertyResponse(
        int id,
        double squareFootage,
        int bedrooms,
        double bathrooms,
        int yearBuilt,
        double lotSize,
        double distanceToCityCenter,
        double schoolRating,
        double price) {
}
