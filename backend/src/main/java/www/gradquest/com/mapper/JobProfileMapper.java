package www.gradquest.com.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import www.gradquest.com.entity.JobProfile;

/**
 * 岗位画像表 job_profiles
 */
@Mapper
public interface JobProfileMapper extends BaseMapper<JobProfile> {
}
