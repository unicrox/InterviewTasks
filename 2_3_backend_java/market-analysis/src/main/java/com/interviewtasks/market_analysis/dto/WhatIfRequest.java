package com.interviewtasks.market_analysis.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record WhatIfRequest(
        @DecimalMin(value = "0.0", inclusive = false) double squareFootage,
        @Min(0) int bedrooms,
        @DecimalMin("0.0") double bathrooms,
        @Min(1800) @Max(2100) int yearBuilt,
        @DecimalMin(value = "0.0", inclusive = false) double lotSize,
        @DecimalMin("0.0") double distanceToCityCenter,
        @DecimalMin("0.0") @Max(10) double schoolRating) {
}
