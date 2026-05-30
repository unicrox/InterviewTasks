package com.interviewtasks.market_analysis.dto;

public record WhatIfResponse(
        double predictedPrice,
        String status) {
}
