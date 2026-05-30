package com.interviewtasks.market_analysis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class MarketAnalysisApplication {

	public static void main(String[] args) {
		SpringApplication.run(MarketAnalysisApplication.class, args);
	}

}
