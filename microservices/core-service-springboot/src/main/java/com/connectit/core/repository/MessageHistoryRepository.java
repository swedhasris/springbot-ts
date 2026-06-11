package com.connectit.core.repository;

import com.connectit.core.model.MessageHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageHistoryRepository extends JpaRepository<MessageHistory, Long> {
    List<MessageHistory> findByUserIdOrderBySentAtDesc(String userId, Pageable pageable);
}
