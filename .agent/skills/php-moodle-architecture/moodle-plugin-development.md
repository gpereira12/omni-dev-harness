---
name: moodle-plugin-development
description: Complete Moodle LMS plugin development guide covering local/mod/block plugin scaffolds, XMLDB schema, upgrade.php, Forms API, Output/Mustache, External/Web Services, Task API, Cache/MUC, Hooks API (4.3+), Events, PHPUnit advanced_testcase, and Behat acceptance testing.
always_use: false
---

# 🧩 Moodle Plugin Development Standards

## 1. Plugin Scaffold — `local_*` (Reference Architecture)

The `local` plugin type is the **primary extension point** for cross-cutting functionality (integrations, cron jobs, event listeners, custom APIs, admin tools).

```text
local/nexus/
├── version.php                          # Plugin metadata & version tracking
├── lib.php                              # Legacy callbacks (prefer Hooks API 4.3+)
├── settings.php                         # Admin settings tree registration
├── db/
│   ├── install.xml                      # XMLDB schema definition
│   ├── upgrade.php                      # Incremental schema migrations
│   ├── access.php                       # Capability definitions
│   ├── services.php                     # External function / Web Service registration
│   ├── tasks.php                        # Scheduled & ad-hoc task registration
│   ├── events.php                       # Event observer subscriptions
│   ├── hooks.php                        # Hook callback registration (4.3+)
│   ├── caches.php                       # MUC cache definitions
│   └── install.php                      # Post-install script (optional)
├── classes/
│   ├── service/                         # Domain service classes
│   ├── form/                            # Moodleform extensions
│   ├── output/                          # Renderables & Templatables
│   ├── external/                        # External API functions
│   ├── task/                            # Scheduled & ad-hoc tasks
│   ├── event/                           # Custom event definitions
│   ├── hook_callbacks.php               # Hook callback implementations
│   └── privacy/                         # GDPR provider (mandatory)
├── templates/                           # Mustache templates
├── lang/
│   └── en/
│       └── local_nexus.php              # Language strings
├── tests/
│   ├── service_test.php                 # PHPUnit tests
│   └── behat/
│       └── sync_flow.feature            # Behat acceptance tests
├── amd/
│   └── src/                             # ESM JavaScript modules
└── pix/
    └── icon.svg                         # Plugin icon
```

### `version.php` (Mandatory)

```php
<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Plugin version and other metadata.
 *
 * @package    local_nexus
 * @copyright  2026 Nexus Architecture Team
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component  = 'local_nexus';
$plugin->version    = 2026082400;          // YYYYMMDDXX format
$plugin->requires   = 2024042200;          // Moodle 4.4+ minimum
$plugin->maturity   = MATURITY_STABLE;
$plugin->release    = '1.0.0';
$plugin->dependencies = [];
```

---

## 2. Database Layer — XMLDB & Migrations

### `db/install.xml` — Schema Definition

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<XMLDB PATH="local/nexus/db" VERSION="20260824" COMMENT="Nexus plugin schema">
  <TABLES>
    <TABLE NAME="local_nexus_sync" COMMENT="Course synchronization log">
      <FIELDS>
        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="courseid" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="false"/>
        <FIELD NAME="status" TYPE="char" LENGTH="50" NOTNULL="true" DEFAULT="pending" SEQUENCE="false"/>
        <FIELD NAME="payload" TYPE="text" NOTNULL="false" SEQUENCE="false"/>
        <FIELD NAME="errormessage" TYPE="text" NOTNULL="false" SEQUENCE="false"/>
        <FIELD NAME="timecreated" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="false"/>
        <FIELD NAME="timemodified" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="false"/>
      </FIELDS>
      <KEYS>
        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>
        <KEY NAME="fk_course" TYPE="foreign" FIELDS="courseid" REFTABLE="course" REFFIELDS="id"/>
      </KEYS>
      <INDEXES>
        <INDEX NAME="idx_status_time" UNIQUE="false" FIELDS="status, timecreated"/>
      </INDEXES>
    </TABLE>
  </TABLES>
</XMLDB>
```

### `db/upgrade.php` — Incremental Migrations

**Rule**: Never call plugin domain classes inside `upgrade.php`. Write self-contained DDL/DML only.

```php
<?php
defined('MOODLE_INTERNAL') || die();

function xmldb_local_nexus_upgrade(int $oldversion): bool {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026082401) {
        // Add 'retries' column to sync table.
        $table = new xmldb_table('local_nexus_sync');
        $field = new xmldb_field('retries', XMLDB_TYPE_INTEGER, '3', null, XMLDB_NOTNULL, null, '0', 'errormessage');

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        upgrade_plugin_savepoint(true, 2026082401, 'local', 'nexus');
    }

    if ($oldversion < 2026082402) {
        // Add composite index for performance.
        $table = new xmldb_table('local_nexus_sync');
        $index = new xmldb_index('idx_course_status', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'status']);

        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        upgrade_plugin_savepoint(true, 2026082402, 'local', 'nexus');
    }

    return true;
}
```

### DML Operations — `$DB` Safe Queries

```php
// ✅ Read — Named placeholders (cross-DB safe)
$sql = "SELECT s.id, s.courseid, c.fullname
          FROM {local_nexus_sync} s
          JOIN {course} c ON c.id = s.courseid
         WHERE s.status = :status AND s.timecreated > :since";
$records = $DB->get_records_sql($sql, ['status' => 'pending', 'since' => time() - 86400]);

// ✅ Write — Object-based insert
$record = (object)[
    'courseid'     => $courseid,
    'status'       => 'pending',
    'timecreated'  => time(),
    'timemodified' => time(),
];
$id = $DB->insert_record('local_nexus_sync', $record);

// ✅ Transaction — Delegated with automatic rollback
$transaction = $DB->start_delegated_transaction();
try {
    $DB->insert_record('local_nexus_sync', $record1);
    $DB->update_record('local_nexus_sync', $record2);
    $transaction->allow_commit();
} catch (\Throwable $e) {
    $transaction->rollback($e);
    throw $e;
}

// ✅ Streaming large datasets — ALWAYS close the recordset
$rs = $DB->get_recordset_sql("SELECT * FROM {local_nexus_sync} WHERE status = :s", ['s' => 'pending']);
try {
    foreach ($rs as $record) {
        // Process without loading entire table into memory.
    }
} finally {
    $rs->close(); // MANDATORY — prevents cursor leaks and memory exhaustion
}
```

---

## 3. Core APIs — Canonical Implementations

### 3.1 Forms API (`moodleform`)

```php
<?php
namespace local_nexus\form;

use moodleform;

defined('MOODLE_INTERNAL') || die();
require_once("$CFG->libdir/formslib.php");

class config_form extends moodleform {
    protected function definition(): void {
        $mform = $this->_form;

        $mform->addElement('header', 'general', get_string('settings', 'local_nexus'));

        $mform->addElement('text', 'endpoint_url', get_string('endpointurl', 'local_nexus'), ['size' => 48]);
        $mform->setType('endpoint_url', PARAM_URL);
        $mform->addRule('endpoint_url', get_string('required'), 'required', null, 'client');
        $mform->addHelpButton('endpoint_url', 'endpointurl', 'local_nexus');

        $mform->addElement('select', 'sync_mode', get_string('syncmode', 'local_nexus'), [
            'full'        => get_string('syncmode_full', 'local_nexus'),
            'incremental' => get_string('syncmode_incremental', 'local_nexus'),
        ]);
        $mform->setDefault('sync_mode', 'incremental');

        $mform->addElement('hidden', 'courseid');
        $mform->setType('courseid', PARAM_INT);

        $this->add_action_buttons(true, get_string('savechanges'));
    }

    public function validation($data, $files): array {
        $errors = parent::validation($data, $files);
        if (!empty($data['endpoint_url']) && !filter_var($data['endpoint_url'], FILTER_VALIDATE_URL)) {
            $errors['endpoint_url'] = get_string('invalidurl', 'local_nexus');
        }
        return $errors;
    }
}
```

### 3.2 Output API — Renderables & Mustache

**Renderable Class** (`classes/output/sync_dashboard.php`):

```php
<?php
namespace local_nexus\output;

use renderable;
use templatable;
use renderer_base;
use stdClass;

class sync_dashboard implements renderable, templatable {
    public function __construct(
        private readonly int   $courseid,
        private readonly array $items,
        private readonly bool  $canedit
    ) {}

    public function export_for_template(renderer_base $output): stdClass {
        $data = new stdClass();
        $data->courseid = $this->courseid;
        $data->canedit  = $this->canedit;
        $data->hasitems = !empty($this->items);
        $data->items    = array_map(fn($item) => [
            'id'     => $item->id,
            'name'   => format_string($item->name),
            'status' => $item->status,
            'time'   => userdate($item->timecreated),
        ], $this->items);
        return $data;
    }
}
```

**Mustache Template** (`templates/sync_dashboard.mustache`):

```html
<div class="local-nexus-dashboard" data-region="nexus-dashboard" data-courseid="{{courseid}}">
    <h3>{{#str}} dashboardtitle, local_nexus {{/str}}</h3>

    {{#hasitems}}
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>{{#str}} name {{/str}}</th>
                    <th>{{#str}} status {{/str}}</th>
                    <th>{{#str}} time {{/str}}</th>
                </tr>
            </thead>
            <tbody>
                {{#items}}
                    <tr>
                        <td>{{name}}</td>
                        <td><span class="badge bg-primary">{{status}}</span></td>
                        <td>{{time}}</td>
                    </tr>
                {{/items}}
            </tbody>
        </table>
    {{/hasitems}}

    {{^hasitems}}
        <div class="alert alert-info">{{#str}} noitems, local_nexus {{/str}}</div>
    {{/hasitems}}

    {{#canedit}}
        <a href="#" class="btn btn-primary" data-action="start-sync">
            {{#str}} startsync, local_nexus {{/str}}
        </a>
    {{/canedit}}
</div>
```

**Page Controller** (`view.php`):

```php
<?php
require_once(__DIR__ . '/../../config.php');

$courseid = required_param('courseid', PARAM_INT);
$course   = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
$context  = context_course::instance($courseid);

require_login($course, false);
require_capability('local/nexus:viewsync', $context);

$PAGE->set_url(new moodle_url('/local/nexus/view.php', ['courseid' => $courseid]));
$PAGE->set_context($context);
$PAGE->set_title(get_string('pluginname', 'local_nexus'));
$PAGE->set_heading($course->fullname);

$items    = $DB->get_records('local_nexus_sync', ['courseid' => $courseid], 'timecreated DESC');
$canedit  = has_capability('local/nexus:managesync', $context);
$widget   = new \local_nexus\output\sync_dashboard($courseid, array_values($items), $canedit);

echo $OUTPUT->header();
echo $OUTPUT->render($widget);
echo $OUTPUT->footer();
```

### 3.3 External Functions / Web Services

**Function Class** (`classes/external/get_sync_status.php`):

```php
<?php
namespace local_nexus\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;
use core_external\external_single_structure;

class get_sync_status extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID', VALUE_REQUIRED),
        ]);
    }

    public static function execute(int $courseid): array {
        $params  = self::validate_parameters(self::execute_parameters(), ['courseid' => $courseid]);
        $context = \context_course::instance($params['courseid']);
        self::validate_context($context);
        require_capability('local/nexus:viewsync', $context);

        global $DB;
        $record = $DB->get_record('local_nexus_sync', ['courseid' => $params['courseid']], '*', IGNORE_MISSING);

        return [
            'courseid'  => $params['courseid'],
            'synced'    => !empty($record),
            'status'    => $record->status ?? 'none',
            'timestamp' => $record->timemodified ?? 0,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'courseid'  => new external_value(PARAM_INT, 'Course ID'),
            'synced'    => new external_value(PARAM_BOOL, 'Whether sync exists'),
            'status'    => new external_value(PARAM_TEXT, 'Current sync status'),
            'timestamp' => new external_value(PARAM_INT, 'Last modification timestamp'),
        ]);
    }
}
```

**Registration** (`db/services.php`):

```php
<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_nexus_get_sync_status' => [
        'classname'    => 'local_nexus\external\get_sync_status',
        'methodname'   => 'execute',
        'description'  => 'Retrieves the sync status for a given course',
        'type'         => 'read',
        'ajax'         => true,
        'capabilities' => 'local/nexus:viewsync',
    ],
];
```

### 3.4 Task API — Scheduled & Ad-Hoc

**Scheduled Task** (`classes/task/sync_courses_task.php`):

```php
<?php
namespace local_nexus\task;

use core\task\scheduled_task;

class sync_courses_task extends scheduled_task {
    public function get_name(): string {
        return get_string('task_synccourses', 'local_nexus');
    }

    public function execute(): void {
        mtrace('Starting Nexus scheduled course sync...');

        global $DB;
        $pending = $DB->get_records('local_nexus_sync', ['status' => 'pending'], '', 'id, courseid', 0, 100);

        foreach ($pending as $record) {
            try {
                // Process synchronization...
                $record->status       = 'completed';
                $record->timemodified = time();
                $DB->update_record('local_nexus_sync', $record);
                mtrace("  ✓ Course {$record->courseid} synced.");
            } catch (\Throwable $e) {
                $record->status       = 'failed';
                $record->errormessage = $e->getMessage();
                $record->timemodified = time();
                $DB->update_record('local_nexus_sync', $record);
                mtrace("  ✗ Course {$record->courseid} failed: {$e->getMessage()}");
            }
        }

        mtrace('Nexus sync completed.');
    }
}
```

**Ad-Hoc Task** (`classes/task/process_webhook_task.php`):

```php
<?php
namespace local_nexus\task;

use core\task\adhoc_task;

class process_webhook_task extends adhoc_task {
    public function execute(): void {
        $data = $this->get_custom_data();
        // Process webhook payload asynchronously.
        mtrace("Processing webhook event: {$data->event_type}");
    }
}

// Queueing from any script:
// $task = new \local_nexus\task\process_webhook_task();
// $task->set_custom_data((object)['event_type' => 'course.updated', 'payload' => '...']);
// $task->set_component('local_nexus');
// \core\task\manager::queue_adhoc_task($task);
```

**Registration** (`db/tasks.php`):

```php
<?php
defined('MOODLE_INTERNAL') || die();

$tasks = [
    [
        'classname' => 'local_nexus\task\sync_courses_task',
        'blocking'  => 0,
        'minute'    => '*/15',
        'hour'      => '*',
        'day'       => '*',
        'month'     => '*',
        'dayofweek' => '*',
    ],
];
```

### 3.5 Cache API (MUC)

**Definition** (`db/caches.php`):

```php
<?php
defined('MOODLE_INTERNAL') || die();

$definitions = [
    'course_sync_metadata' => [
        'mode'               => cache_store::MODE_APPLICATION,
        'simplekeys'         => true,
        'simpledata'         => false,
        'ttl'                => 3600,
        'staticacceleration' => true,
        'staticaccelerationsize' => 50,
    ],
];
```

**Usage**:

```php
$cache = \cache::make('local_nexus', 'course_sync_metadata');

$metadata = $cache->get("course_{$courseid}");
if ($metadata === false) {
    $metadata = $DB->get_record('local_nexus_sync', ['courseid' => $courseid]);
    $cache->set("course_{$courseid}", $metadata);
}

// Invalidation on write
$cache->delete("course_{$courseid}");
```

### 3.6 Hooks API (Moodle 4.3+)

**Registration** (`db/hooks.php`):

```php
<?php
defined('MOODLE_INTERNAL') || die();

$callbacks = [
    [
        'hook'     => \core_course\hook\after_course_created::class,
        'callback' => 'local_nexus\hook_callbacks::after_course_created',
        'priority' => 500,
    ],
    [
        'hook'     => \core\hook\output\before_standard_top_of_body_html_generation::class,
        'callback' => 'local_nexus\hook_callbacks::inject_tracking_pixel',
    ],
];
```

**Implementation** (`classes/hook_callbacks.php`):

```php
<?php
namespace local_nexus;

use core_course\hook\after_course_created;
use core\hook\output\before_standard_top_of_body_html_generation;

class hook_callbacks {
    public static function after_course_created(after_course_created $hook): void {
        $course = $hook->get_course();

        // Queue async sync for the newly created course.
        $task = new \local_nexus\task\process_webhook_task();
        $task->set_custom_data((object)[
            'event_type' => 'course.created',
            'courseid'   => $course->id,
        ]);
        $task->set_component('local_nexus');
        \core\task\manager::queue_adhoc_task($task);
    }

    public static function inject_tracking_pixel(before_standard_top_of_body_html_generation $hook): void {
        if (get_config('local_nexus', 'tracking_enabled')) {
            $hook->add_html('<script src="/local/nexus/amd/src/tracker.js" type="module" defer></script>');
        }
    }
}
```

### 3.7 Capabilities (`db/access.php`)

```php
<?php
defined('MOODLE_INTERNAL') || die();

$capabilities = [
    'local/nexus:viewsync' => [
        'captype'      => 'read',
        'contextlevel' => CONTEXT_COURSE,
        'archetypes'   => [
            'student'        => CAP_ALLOW,
            'teacher'        => CAP_ALLOW,
            'editingteacher' => CAP_ALLOW,
            'manager'        => CAP_ALLOW,
        ],
    ],
    'local/nexus:managesync' => [
        'riskbitmask'  => RISK_CONFIG | RISK_DATALOSS,
        'captype'      => 'write',
        'contextlevel' => CONTEXT_COURSE,
        'archetypes'   => [
            'editingteacher' => CAP_ALLOW,
            'manager'        => CAP_ALLOW,
        ],
    ],
];
```

---

## 4. Events API — Custom Events & Observers

**Custom Event** (`classes/event/sync_completed.php`):

```php
<?php
namespace local_nexus\event;

use core\event\base;

class sync_completed extends base {
    protected function init(): void {
        $this->data['crud']        = 'u';
        $this->data['edulevel']    = self::LEVEL_OTHER;
        $this->data['objecttable'] = 'local_nexus_sync';
    }

    public static function get_name(): string {
        return get_string('event_synccompleted', 'local_nexus');
    }

    public function get_description(): string {
        return "User {$this->userid} completed sync for course {$this->courseid}.";
    }

    public function get_url(): \moodle_url {
        return new \moodle_url('/local/nexus/view.php', ['courseid' => $this->courseid]);
    }
}
```

**Observer Registration** (`db/events.php`):

```php
<?php
defined('MOODLE_INTERNAL') || die();

$observers = [
    [
        'eventname' => '\core\event\course_deleted',
        'callback'  => 'local_nexus\observer\course_observer::on_course_deleted',
    ],
];
```

---

## 5. Testing

### 5.1 PHPUnit — `advanced_testcase`

```php
<?php
namespace local_nexus;

use advanced_testcase;

/**
 * @covers \local_nexus\service\sync_manager
 */
class sync_manager_test extends advanced_testcase {
    protected function setUp(): void {
        $this->resetAfterTest(true);
    }

    public function test_creates_sync_record_for_course(): void {
        global $DB;

        $generator = $this->getDataGenerator();
        $course    = $generator->create_course(['fullname' => 'Architecture 101']);
        $user      = $generator->create_user();
        $this->setUser($user);

        $service = new \local_nexus\service\sync_manager();
        $result  = $service->enqueue_sync($course->id);

        $this->assertTrue($result);
        $record = $DB->get_record('local_nexus_sync', ['courseid' => $course->id]);
        $this->assertNotEmpty($record);
        $this->assertEquals('pending', $record->status);
    }

    public function test_rejects_sync_for_nonexistent_course(): void {
        $this->expectException(\dml_missing_record_exception::class);

        $service = new \local_nexus\service\sync_manager();
        $service->enqueue_sync(999999);
    }
}
```

### 5.2 Behat — Acceptance Testing

```gherkin
@local @local_nexus @javascript
Feature: Course Synchronization Dashboard
  As a teacher
  I need to view and manage course sync status

  Background:
    Given the following "courses" exist:
      | fullname         | shortname | category |
      | Architecture 101 | ARCH101   | 0        |
    And the following "users" exist:
      | username | firstname | lastname | email             |
      | teacher1 | Jane      | Doe      | jane@example.com  |
    And the following "course enrolments" exist:
      | user     | course  | role           |
      | teacher1 | ARCH101 | editingteacher |

  Scenario: Teacher views sync dashboard
    Given I log in as "teacher1"
    And I am on "Architecture 101" course homepage
    When I navigate to "Nexus Sync" in current page administration
    Then I should see "Sync Dashboard"

  Scenario: Teacher triggers manual sync
    Given I log in as "teacher1"
    And I am on "Architecture 101" course homepage
    And I navigate to "Nexus Sync" in current page administration
    When I click on "Start Sync" "button"
    Then I should see "pending"
```

---

## 6. GDPR Privacy Provider (Mandatory)

```php
<?php
namespace local_nexus\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\approved_userlist;

class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\plugin\provider,
    \core_privacy\local\request\core_userlist_provider {

    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table('local_nexus_sync', [
            'courseid'    => 'privacy:metadata:courseid',
            'status'      => 'privacy:metadata:status',
            'timecreated' => 'privacy:metadata:timecreated',
        ], 'privacy:metadata:sync');

        return $collection;
    }

    public static function get_contexts_for_userid(int $userid): contextlist {
        $contextlist = new contextlist();
        // Query contexts where this user has sync data.
        return $contextlist;
    }

    public static function export_user_data(approved_contextlist $contextlist): void {
        // Export user's sync data for GDPR subject access request.
    }

    public static function delete_data_for_all_users_in_context(\context $context): void {
        // Delete all plugin data in the given context.
    }

    public static function delete_data_for_user(approved_contextlist $contextlist): void {
        // Delete plugin data for a specific user.
    }

    public static function get_users_in_context(userlist $userlist): void {
        // Identify users who have data in this context.
    }

    public static function delete_data_for_users(approved_userlist $userlist): void {
        // Delete plugin data for a list of users.
    }
}
```

---

## 7. Language Strings (`lang/en/local_nexus.php`)

```php
<?php
defined('MOODLE_INTERNAL') || die();

$string['pluginname']              = 'Nexus Integration';
$string['settings']                = 'Nexus Settings';
$string['endpointurl']             = 'API Endpoint URL';
$string['endpointurl_help']        = 'The external API endpoint for course synchronization.';
$string['invalidurl']              = 'Please enter a valid URL.';
$string['syncmode']                = 'Sync Mode';
$string['syncmode_full']           = 'Full Sync';
$string['syncmode_incremental']    = 'Incremental Sync';
$string['dashboardtitle']          = 'Sync Dashboard';
$string['noitems']                 = 'No synchronization records found.';
$string['startsync']               = 'Start Sync';
$string['task_synccourses']        = 'Synchronize courses with Nexus';
$string['event_synccompleted']     = 'Course sync completed';
$string['nexus:viewsync']         = 'View sync status';
$string['nexus:managesync']       = 'Manage sync operations';
$string['privacy:metadata:sync']   = 'Nexus stores course sync logs.';
$string['privacy:metadata:courseid'] = 'The ID of the course being synced.';
$string['privacy:metadata:status']   = 'The sync status.';
$string['privacy:metadata:timecreated'] = 'The time the sync was created.';
```
