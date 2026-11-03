package com.dayt.global.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Hidden
@RestController
public class SpecDocController {

	private final int serverPort;

	public SpecDocController(@Value("${server.port:8080}") int serverPort) {
		this.serverPort = serverPort;
	}

	@GetMapping(value = "/v3/api-spec.yaml", produces = "application/yaml;charset=UTF-8")
	public ResponseEntity<String> getApiSpecYaml() throws IOException {
		Path specPath = Files.exists(Path.of("../docs/api-spec.yaml"))
				? Path.of("../docs/api-spec.yaml")
				: Path.of("docs/api-spec.yaml");

		String yaml = Files.readString(specPath, StandardCharsets.UTF_8)
				.replace("http://localhost:8080", "http://localhost:" + serverPort);

		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType("application/yaml;charset=UTF-8"))
				.body(yaml);
	}
}

