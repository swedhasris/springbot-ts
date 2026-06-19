package com.connectit.core.repository;
import com.connectit.core.model.SLAPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface SLAPolicyRepository extends JpaRepository<SLAPolicy, Long> {
    List<SLAPolicy> findByIsActiveTrueOrderByPriorityAsc();
    List<SLAPolicy> findAllByOrderByPriorityAsc();
    Optional<SLAPolicy> findFirstByPriorityAndIsActiveTrue(String priority);
}
