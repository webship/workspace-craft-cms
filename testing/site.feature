Feature: The site answers and its account works
  As the owner of the site
  I want the front page, the login form and the admin account to work
  So that a build that came out broken is caught before anything else is tested

  # Placed by the workspace's testing setup as a starting point: it is yours to change.
  # The site is on the free edition, which has one account, an admin: the scenarios log in with
  # it by the handle "admin" of the users registry in cucumber.js, so no password is written here.

  @critical
  Scenario: The front page is served
    Given I am an anonymous user
    And I am on the homepage
    Then the response status code should be 200
    And the page should have a title

  @critical
  Scenario: A visitor is sent to the login form
    Given I am an anonymous user
    When I go to "/admin/content/entries"
    Then I should see the control panel login form
    And I should not be logged in to the control panel

  Scenario: The admin logs in
    Given I am logged in to the control panel as "admin"
    Then I should be logged in to the control panel as "admin"
    And the control panel heading should be "Dashboard"

  Scenario: The admin may open the pages of an admin
    Given I am logged in to the control panel as "admin"
    Then I should be allowed to open the control panel page "entries"
    And I should be allowed to open the control panel page "settings"
    And I should be allowed to open the control panel page "utilities"

  Scenario: Logging out ends the session
    Given I am logged in to the control panel as "admin"
    When I log out of the control panel
    Then I should not be logged in to the control panel
    And I should see the control panel login form
