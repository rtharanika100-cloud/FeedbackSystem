package com.capstone.feedbackworkflow.repository;

import com.capstone.feedbackworkflow.entity.Feedback;
import com.capstone.feedbackworkflow.entity.FeedbackStatus;
import com.capstone.feedbackworkflow.entity.FeedbackPriority;
import com.capstone.feedbackworkflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByCustomer(User customer);
    List<Feedback> findByAssignee(User assignee);
    List<Feedback> findByStatus(FeedbackStatus status);
    List<Feedback> findByPriority(FeedbackPriority priority);
}
