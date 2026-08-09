package com.capstone.feedbackworkflow.repository;

import com.capstone.feedbackworkflow.entity.User;
import com.capstone.feedbackworkflow.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findByRole(UserRole role);
}
