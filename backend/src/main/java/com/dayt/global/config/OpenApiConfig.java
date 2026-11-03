package com.dayt.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	private static final String BEARER_SCHEME_NAME = "bearerAuth";

	@Bean
	public OpenAPI daytOpenAPI() {
		return new OpenAPI()
				.info(new Info()
						.title("DayT Backend API (Live)")
						.version("1.0.0")
						.description("현재 Spring Boot 서버에 실제 구현된 엔드포인트 문서입니다. 우측 상단 드롭다운에서 전체 설계 명세(docs/api-spec.yaml)로 전환할 수 있습니다."))
				.addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME))
				.components(new Components()
						.addSecuritySchemes(BEARER_SCHEME_NAME, new SecurityScheme()
								.name(BEARER_SCHEME_NAME)
								.type(SecurityScheme.Type.HTTP)
								.scheme("bearer")
								.bearerFormat("JWT")));
	}
}
