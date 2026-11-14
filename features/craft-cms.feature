Feature: The Craft CMS plugin on the dashboard
  Once the plugin is activated and installed, the sites folders offer the Craft CMS builder, the
  AI Agents folder lists the Craft CMS agents, and the Plugins page lists the plugin with its steps.

  Scenario: The plugin is listed on the Plugins page
    Given I am on "/settings/plugins"
     Then I should see "Craft CMS"
      And I should see "@webship.co/workspace-craft-cms"

  Scenario: A sites folder offers the Craft CMS builder
    Given I am on "/dev"
     Then "option[value='cmd-craft-cms-project.sh']" should be attached

  Scenario: The AI Agents folder lists the agents the plugin ships
    Given I am on "/ai-agents"
     Then I should see "craft-cms-site-builder"
      And I should see "craft-cms-tester"
