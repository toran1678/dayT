package com.dayt.domain.place.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class FoodCategoryAttributeConverter implements AttributeConverter<FoodCategory, String> {

	@Override
	public String convertToDatabaseColumn(FoodCategory attribute) {
		return (attribute != null) ? attribute.getLabel() : null;
	}

	@Override
	public FoodCategory convertToEntityAttribute(String dbData) {
		return (dbData != null && !dbData.isBlank()) ? FoodCategory.fromValue(dbData) : null;
	}
}

