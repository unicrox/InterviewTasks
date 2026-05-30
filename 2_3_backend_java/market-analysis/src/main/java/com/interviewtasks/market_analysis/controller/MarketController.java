package com.interviewtasks.market_analysis.controller;

import com.interviewtasks.market_analysis.dto.MarketSummaryResponse;
import com.interviewtasks.market_analysis.dto.PropertyResponse;
import com.interviewtasks.market_analysis.dto.WhatIfRequest;
import com.interviewtasks.market_analysis.dto.WhatIfResponse;
import com.interviewtasks.market_analysis.service.MarketDataService;
import com.interviewtasks.market_analysis.service.ModelClient;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/market")
public class MarketController {

    private final MarketDataService marketDataService;
    private final ModelClient modelClient;

    public MarketController(MarketDataService marketDataService, ModelClient modelClient) {
        this.marketDataService = marketDataService;
        this.modelClient = modelClient;
    }

    @GetMapping("/properties")
    public List<PropertyResponse> properties(
            @RequestParam(required = false) Integer bedrooms,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection) {
        return marketDataService.findProperties(bedrooms, minPrice, maxPrice, sortBy, sortDirection);
    }

    @GetMapping("/summary")
    public MarketSummaryResponse summary() {
        return marketDataService.getSummary();
    }

    @PostMapping("/what-if")
    public WhatIfResponse whatIf(@Valid @RequestBody WhatIfRequest request) {
        return modelClient.predict(request);
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"market-data.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
                .body(marketDataService.exportCsv());
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"market-summary.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(marketDataService.exportPdf());
    }
}
