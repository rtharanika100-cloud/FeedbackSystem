package com.capstone.feedbackworkflow.repository;

import com.capstone.feedbackworkflow.entity.Feedback;
import com.capstone.feedbackworkflow.entity.FeedbackHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackHistoryRepository extends JpaRepository<FeedbackHistory, Long> {
    List<FeedbackHistory> findByFeedbackOrderByTimestampDesc(Feedback feedback);
}
