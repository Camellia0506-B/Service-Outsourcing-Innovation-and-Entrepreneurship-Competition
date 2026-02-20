package www.gradquest.com.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import www.gradquest.com.entity.PasswordResetCode;

@Mapper
public interface PasswordResetCodeMapper extends BaseMapper<PasswordResetCode> {
}
