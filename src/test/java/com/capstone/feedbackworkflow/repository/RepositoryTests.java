package com.capstone.feedbackworkflow.repository;

import com.capstone.feedbackworkflow.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class RepositoryTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private FeedbackHistoryRepository feedbackHistoryRepository;

    @Test
    void testUserPersistence() {
        User customer = new User("alice", "pass123", "alice@example.com", UserRole.CUSTOMER);
        User savedCustomer = userRepository.save(customer);

        assertThat(savedCustomer.getId()).isNotNull();
        assertThat(savedCustomer.getCreatedAt()).isNotNull();

        Optional<User> foundUser = userRepository.findByUsername("alice");
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("alice@example.com");

        List<User> customers = userRepository.findByRole(UserRole.CUSTOMER);
        assertThat(customers).hasSize(1);
    }

    @Test
    void testFeedbackPersistenceAndQueries() {
        User customer = new User("bob", "pass123", "bob@example.com", UserRole.CUSTOMER);
        User savedCustomer = userRepository.save(customer);

        Feedback feedback = new Feedback(
                "Billing issue",
                "I was double charged on my invoice.",
                FeedbackCategory.BILLING,
                FeedbackPriority.HIGH,
                FeedbackStatus.CREATED,
                savedCustomer
        );

        Feedback savedFeedback = feedbackRepository.save(feedback);
        assertThat(savedFeedback.getId()).isNotNull();
        assertThat(savedFeedback.getCreatedAt()).isNotNull();
        assertThat(savedFeedback.getUpdatedAt()).isNotNull();

        List<Feedback> customerFeedbacks = feedbackRepository.findByCustomer(savedCustomer);
        assertThat(customerFeedbacks).hasSize(1);
        assertThat(customerFeedbacks.get(0).getTitle()).isEqualTo("Billing issue");

        List<Feedback> createdFeedbacks = feedbackRepository.findByStatus(FeedbackStatus.CREATED);
        assertThat(createdFeedbacks).isNotEmpty();
    }

    @Test
    void testFeedbackHistoryAuditing() {
        User customer = new User("charlie", "pass123", "charlie@example.com", UserRole.CUSTOMER);
        User savedCustomer = userRepository.save(customer);

        User agent = new User("agent_smith", "pass123", "smith@example.com", UserRole.AGENT);
        User savedAgent = userRepository.save(agent);

        Feedback feedback = new Feedback(
                "Technical bug",
                "App crashes on launch.",
                FeedbackCategory.TECHNICAL,
                FeedbackPriority.URGENT,
                FeedbackStatus.CREATED,
                savedCustomer
        );
        Feedback savedFeedback = feedbackRepository.save(feedback);

        // Simulate Status Transition and Assignee Update
        savedFeedback.setStatus(FeedbackStatus.ASSIGNED);
        savedFeedback.setAssignee(savedAgent);
        feedbackRepository.save(savedFeedback);

        FeedbackHistory history = new FeedbackHistory(
                savedFeedback,
                savedAgent,
                FeedbackStatus.CREATED,
                FeedbackStatus.ASSIGNED,
                "Assigned to Agent Smith for investigation"
        );
        FeedbackHistory savedHistory = feedbackHistoryRepository.save(history);
        assertThat(savedHistory.getId()).isNotNull();
        assertThat(savedHistory.getTimestamp()).isNotNull();

        List<FeedbackHistory> histories = feedbackHistoryRepository.findByFeedbackOrderByTimestampDesc(savedFeedback);
        assertThat(histories).hasSize(1);
        assertThat(histories.get(0).getNewStatus()).isEqualTo(FeedbackStatus.ASSIGNED);
        assertThat(histories.get(0).getNotes()).contains("Agent Smith");
    }
}
