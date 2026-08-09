package com.capstone.feedbackworkflow.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_history")
public class FeedbackHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feedback_id", nullable = false)
    private Feedback feedback;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_by_id", nullable = false)
    private User actionBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status")
    private FeedbackStatus oldStatus;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private FeedbackStatus newStatus;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }

    public FeedbackHistory() {
    }

    public FeedbackHistory(Feedback feedback, User actionBy, FeedbackStatus oldStatus, FeedbackStatus newStatus, String notes) {
        this.feedback = feedback;
        this.actionBy = actionBy;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.notes = notes;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Feedback getFeedback() {
        return feedback;
    }

    public void setFeedback(Feedback feedback) {
        this.feedback = feedback;
    }

    public User getActionBy() {
        return actionBy;
    }

    public void setActionBy(User actionBy) {
        this.actionBy = actionBy;
    }

    public FeedbackStatus getOldStatus() {
        return oldStatus;
    }

    public void setOldStatus(FeedbackStatus oldStatus) {
        this.oldStatus = oldStatus;
    }

    public FeedbackStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(FeedbackStatus newStatus) {
        this.newStatus = newStatus;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
