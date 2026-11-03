package com.dayt.domain.auth.token;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.dayt.domain.user.entity.OAuthProvider;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

	private static final String CLAIM_TOKEN_TYPE = "type";
	private static final String CLAIM_PROVIDER = "provider";
	private static final String TYPE_ACCESS = "ACCESS";
	private static final String TYPE_REFRESH = "REFRESH";

	private final JwtEncoder jwtEncoder;
	private final JwtDecoder rawJwtDecoder;
	private final Duration accessTokenTtl;
	private final Duration refreshTokenTtl;

	public JwtTokenProvider(
			JwtEncoder jwtEncoder,
			@Value("${dayt.jwt.secret}") String jwtSecret,
			@Value("${dayt.jwt.access-token-ttl-seconds:3600}") long accessTokenTtlSeconds,
			@Value("${dayt.jwt.refresh-token-ttl-seconds:1209600}") long refreshTokenTtlSeconds
	) {
		this.jwtEncoder = jwtEncoder;
		SecretKey secretKey = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
		this.rawJwtDecoder = NimbusJwtDecoder.withSecretKey(secretKey)
				.macAlgorithm(MacAlgorithm.HS256)
				.build();
		this.accessTokenTtl = Duration.ofSeconds(accessTokenTtlSeconds);
		this.refreshTokenTtl = Duration.ofSeconds(refreshTokenTtlSeconds);
	}

	public String createAccessToken(Long userId, OAuthProvider provider) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer("dayt-backend")
				.subject(String.valueOf(userId))
				.issuedAt(now)
				.expiresAt(now.plus(accessTokenTtl))
				.id(UUID.randomUUID().toString())
				.claim(CLAIM_TOKEN_TYPE, TYPE_ACCESS)
				.claim(CLAIM_PROVIDER, provider.name())
				.build();

		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	public String createRefreshToken(Long userId) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer("dayt-backend")
				.subject(String.valueOf(userId))
				.issuedAt(now)
				.expiresAt(now.plus(refreshTokenTtl))
				.id(UUID.randomUUID().toString())
				.claim(CLAIM_TOKEN_TYPE, TYPE_REFRESH)
				.build();

		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	public Long parseAndValidateRefreshToken(String refreshToken) {
		try {
			Jwt decoded = rawJwtDecoder.decode(refreshToken);
			String tokenType = decoded.getClaimAsString(CLAIM_TOKEN_TYPE);
			if (!TYPE_REFRESH.equals(tokenType) || decoded.getSubject() == null) {
				throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다.");
			}
			return Long.parseLong(decoded.getSubject());
		}
		catch (JwtException | IllegalArgumentException ex) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "만료되었거나 유효하지 않은 리프레시 토큰입니다.");
		}
	}

	public Duration getRefreshTokenTtl() {
		return refreshTokenTtl;
	}
}

