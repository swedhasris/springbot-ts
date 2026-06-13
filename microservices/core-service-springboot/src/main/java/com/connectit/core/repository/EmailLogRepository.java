package com.connectit.core.repository;
import com.connectit.core.model.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findByTicketIdOrderByCreatedAtDesc(Long ticketId);
    List<EmailLog> findAllByOrderByCreatedAtDesc(Pageable p);
    List<EmailLog> findByMessageId(String messageId);
    boolean existsByMessageId(String messageId);
    @Query("SELECT COUNT(e) FROM EmailLog e WHERE e.direction='outbound' AND e.sentAt >= :since")
    long countSentSince(LocalDateTime since);
    @Query("SELECT COUNT(e) FROM EmailLog e WHERE e.direction='inbound' AND e.receivedAt >= :since")
    long countReceivedSince(LocalDateTime since);
}
