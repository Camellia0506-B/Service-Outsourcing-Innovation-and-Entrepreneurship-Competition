package www.gradquest.com.common;

import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * @author zhangzherui
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String msg = fieldError != null && fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "参数错误";
        return ApiResponse.badRequest(msg);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ApiResponse<Void> handleBadRequest(HttpMessageNotReadableException e) {
        return ApiResponse.badRequest("请求体格式错误");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ApiResponse<Void> handleIllegalArgument(IllegalArgumentException e) {
        return ApiResponse.badRequest(e.getMessage());
    }

    /**
     * Spring Boot 3 / Spring 6：
     * 当请求路径没有匹配到 Controller 且被当作静态资源处理时，会抛出 NoResourceFoundException，
     * 其 message 形如 "No static resource xxx."。这里将其按 404 处理，避免前端误判为 500。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ApiResponse<Void> handleNoResourceFound(NoResourceFoundException e) {
        return ApiResponse.failure(404, "接口不存在");
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleException(Exception e) {
        return ApiResponse.serverError(e.getMessage());
    }
}
