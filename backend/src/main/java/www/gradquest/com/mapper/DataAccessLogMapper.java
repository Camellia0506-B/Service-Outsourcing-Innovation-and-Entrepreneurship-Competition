package www.gradquest.com.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import www.gradquest.com.entity.DataAccessLog;

@Mapper
public interface DataAccessLogMapper extends BaseMapper<DataAccessLog> {
}
