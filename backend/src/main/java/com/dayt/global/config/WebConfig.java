package com.dayt.global.config;

import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	@Override
	public void addFormatters(FormatterRegistry registry) {
		registry.addConverter(String.class, FoodCategory.class, FoodCategory::fromValue);
		registry.addConverter(String.class, PlaceCategoryGroup.class, PlaceCategoryGroup::fromParam);
	}
}

