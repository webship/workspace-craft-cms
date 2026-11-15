Feature: The control panel of a fresh site has the navigation of the Solo edition
  As the owner of the site
  I want the navigation, the settings and the pages an admin may open checked
  So that a change of edition or of permissions is caught by the suite

  Scenario: The navigation lists what a fresh Solo site has
    Given I am logged in to the control panel as "admin"
    Then the control panel navigation item "Dashboard" should be selected
    And I should see "Settings" in the control panel navigation
    And I should see "Utilities" in the control panel navigation
    And I should not see "Entries" in the control panel navigation
    And I should not see "Users" in the control panel navigation

  Scenario: The navigation leads to the settings and the utilities
    Given I am logged in to the control panel as "admin"
    When I click "Settings" in the control panel navigation
    Then the control panel heading should be "Settings"
    And the control panel navigation item "Settings" should be selected
    When I click "Utilities" in the control panel navigation
    Then the control panel navigation item "Utilities" should be selected

  Scenario: A settings page has its heading and its breadcrumb
    Given I am logged in to the control panel as "admin"
    When I go to the control panel page "settings/sections"
    Then the control panel heading should be "Sections"
    And the control panel breadcrumb should be "Settings"
    When I go to the control panel page "settings/general"
    Then the control panel heading should be "General Settings"

  Scenario: The admin may open every page of an admin
    Given I am logged in to the control panel as "admin"
    Then I should be allowed to open the control panel page "settings"
    And I should be allowed to open the control panel page "utilities"
    And I should be allowed to open the control panel page "myaccount"
