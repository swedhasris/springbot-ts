package com.connectit.core.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ViewController {

    @RequestMapping(value = {
        "/",
        "/login",
        "/register",
        "/my-dashboard",
        "/dashboard",
        "/tickets",
        "/tickets/{id}",
        "/history",
        "/sla",
        "/approvals",
        "/users",
        "/incident-categories",
        "/timesheet",
        "/timesheet/{weekStart}",
        "/timesheet/weekly",
        "/timesheet/reports",
        "/reports",
        "/catalog",
        "/cmdb",
        "/conversations",
        "/problem",
        "/change",
        "/kb",
        "/calendar",
        "/access-control",
        "/leaderboard",
        "/approved-tickets",
        "/companies",
        "/companies/{id}",
        "/timesheet-approvals",
        "/groups",
        "/clear-users",
        "/email-integrations",
        "/branding",
        "/settings",
        "/activity-tracker",
        "/data-analytics",
        "/global-search",
        "/meetings",
        "/create-meeting",
        "/ts-meeting/{tsmId}/lobby",
        "/ts-meeting/{tsmId}/room"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
