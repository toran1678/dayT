package com.dayt.global.error;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
		ErrorCode errorCode = ex.getErrorCode();
		return ResponseEntity
				.status(errorCode.getStatus())
				.body(ErrorResponse.of(errorCode, ex.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
		FieldError fieldError = ex.getBindingResult().getFieldError();
		String detail = (fieldError != null)
				? fieldError.getField() + ": " + fieldError.getDefaultMessage()
				: ErrorCode.INVALID_INPUT.getMessage();
		return ResponseEntity
				.status(ErrorCode.INVALID_INPUT.getStatus())
				.body(ErrorResponse.of(ErrorCode.INVALID_INPUT, detail));
	}

	@ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
	public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex) {
		return ResponseEntity
				.status(ErrorCode.INVALID_INPUT.getStatus())
				.body(ErrorResponse.of(ErrorCode.INVALID_INPUT, ex.getMessage()));
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ErrorResponse> handleNoResourceFound(NoResourceFoundException ex) {
		return ResponseEntity
				.status(ErrorCode.NOT_FOUND.getStatus())
				.body(ErrorResponse.of(ErrorCode.NOT_FOUND));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception ex) {
		log.error("Unhandled server exception", ex);
		return ResponseEntity
				.status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus())
				.body(ErrorResponse.of(ErrorCode.INTERNAL_SERVER_ERROR));
	}
}

