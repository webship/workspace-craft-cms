Feature: The site answers a visitor
  As a visitor
  I want the front page served and an unknown address refused
  So that a broken template or routing is caught by the suite

  Scenario: The front page is served
    Given I am an anonymous user
    And I am on the homepage
    Then the response status code should be 200
    And the page should have a title

  Scenario: An address nobody made is not found
    Given I am an anonymous user
    When I go to "/no-such-page-anywhere"
    Then the response status code should be 404
