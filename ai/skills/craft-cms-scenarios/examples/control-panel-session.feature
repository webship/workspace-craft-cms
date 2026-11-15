Feature: The control panel lets the admin in, and nobody else
  As the owner of the site
  I want the admin to log in and out, and a wrong login to be refused
  So that a broken login is caught before anything else is tested

  # The site is on the free Solo edition: one account, the admin. A scenario logs in by the
  # "admin" handle of the users registry.

  Scenario: The admin logs in and out
    Given I am logged in to the control panel as "admin"
    Then I should be logged in to the control panel as "admin"
    And the control panel heading should be "Dashboard"
    And I should not see an error notification
    When I log out of the control panel
    Then I should not be logged in to the control panel
    And I should see the control panel login form

  Scenario: An account nobody has is refused
    When I log in to the control panel with the username "nobody" and the password "wrong-password"
    Then I should see the login error "Invalid username or password."
    And I should not be logged in to the control panel

  Scenario: A password reset answers the same for an address nobody has
    When I ask for a password reset for "nobody@example.com"
    Then I should see the password reset confirmation

  Scenario: A visitor is sent to the login form
    Given I am an anonymous user
    When I go to "/admin/settings"
    Then I should see the control panel login form
    And I should not be logged in to the control panel
