import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.testng.Assert;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.*;

public class OpenNavTestNG {

    private static final String BASE_URL = "http://localhost:4000";
    private static final String VENUE_ID = "venue-metropolis-medical";
    private static final String LEVEL_1_ID = "level-metro-l1";
    private static final String LEVEL_2_ID = "level-metro-l2";

    // Results tracking for Final Summary table
    private static final List<TestResultRecord> testResults = new ArrayList<>();
    private static int passCount = 0;
    private static int failCount = 0;
    private static int skipCount = 0;

    private static class TestResultRecord {
        String testId;
        String testName;
        String status;
        long executionTimeMs;
        String failureReason;

        TestResultRecord(String testId, String testName, String status, long executionTimeMs, String failureReason) {
            this.testId = testId;
            this.testName = testName;
            this.status = status;
            this.executionTimeMs = executionTimeMs;
            this.failureReason = failureReason;
        }
    }

    @BeforeClass
    public void setup() {
        RestAssured.baseURI = BASE_URL;

        System.out.println("========================================================");
        System.out.println("       OpenNav - Automated TestNG Test Suite");
        System.out.println("========================================================");
        System.out.println("Server: " + BASE_URL);
        System.out.println("Framework: Java + TestNG + REST Assured");
        System.out.println("Test Cases: 10");
        System.out.println("========================================================\n");

        // Verify Server Health
        try {
            Response healthRes = RestAssured.get("/api/health");
            Assert.assertEquals(healthRes.statusCode(), 200, "Backend server must be running and healthy");
            System.out.println("[SETUP] Backend server verified at " + BASE_URL + " (Health Status: OK)\n");
        } catch (Exception e) {
            Assert.fail("[SETUP FAILED] Backend server is not accessible at " + BASE_URL + ". Error: " + e.getMessage());
        }
    }

    // ----------------------------------------------------
    // TC_001 — Floor Plan / Map Data
    // ----------------------------------------------------
    @Test(priority = 1)
    public void TC001_FloorPlanMapData() {
        String testId = "TC_001";
        String testName = "Floor Plan / Map Data";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Response response = RestAssured.given()
                    .when()
                    .get("/api/venues/" + VENUE_ID)
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "success should be true");

            String venueName = response.jsonPath().getString("data.venue.name");
            Assert.assertNotNull(venueName, "Venue name must exist");
            Assert.assertTrue(venueName.contains("Metropolis"), "Expected Metropolis Medical Center");

            List<Map<String, Object>> levels = response.jsonPath().getList("data.levels");
            Assert.assertNotNull(levels, "Levels list must not be null");
            Assert.assertTrue(levels.size() >= 3, "Expected at least 3 levels in venue");

            Map<String, Object> l1 = levels.get(0);
            Assert.assertNotNull(l1.get("id"), "Level ID required");
            Assert.assertNotNull(l1.get("name"), "Level name required");
            Assert.assertNotNull(l1.get("scale_pixels_per_meter"), "Scale pixels per meter required");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_002 — Optimal Path Calculation
    // ----------------------------------------------------
    @Test(priority = 2)
    public void TC002_OptimalPathCalculation() {
        String testId = "TC_002";
        String testName = "Optimal Path Calculation";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("startNodeId", "node-l1-entrance");
            payload.put("targetNodeId", "node-l1-pharmacy-door");
            payload.put("accessibleOnly", false);

            Response response = RestAssured.given()
                    .contentType(ContentType.JSON)
                    .body(payload)
                    .when()
                    .post("/api/venues/" + VENUE_ID + "/route")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "Route calculation must succeed");

            float totalDistance = response.jsonPath().getFloat("totalDistanceMeters");
            Assert.assertTrue(totalDistance > 0, "Route distance must be greater than 0");

            List<Map<String, Object>> waypoints = response.jsonPath().getList("waypoints");
            Assert.assertNotNull(waypoints, "Waypoints must not be null");
            Assert.assertTrue(waypoints.size() >= 2, "Path must contain at least 2 waypoints");

            String startNode = (String) waypoints.get(0).get("nodeId");
            String endNode = (String) waypoints.get(waypoints.size() - 1).get("nodeId");
            Assert.assertEquals(startNode, "node-l1-entrance", "Start node must match");
            Assert.assertEquals(endNode, "node-l1-pharmacy-door", "Destination node must match");

            List<Map<String, Object>> steps = response.jsonPath().getList("steps");
            Assert.assertNotNull(steps, "Turn-by-turn guidance steps must exist");
            Assert.assertTrue(steps.size() >= 1, "Must contain guidance steps");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_003 — Interactive Map Data
    // ----------------------------------------------------
    @Test(priority = 3)
    public void TC003_InteractiveMapData() {
        String testId = "TC_003";
        String testName = "Interactive Map Data";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Response response = RestAssured.given()
                    .when()
                    .get("/api/venues/" + VENUE_ID + "/levels/" + LEVEL_1_ID + "/map")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "success should be true");

            String levelId = response.jsonPath().getString("data.level.id");
            Assert.assertEquals(levelId, LEVEL_1_ID, "Requested level ID must match");

            String unitsType = response.jsonPath().getString("data.units.type");
            Assert.assertEquals(unitsType, "FeatureCollection", "Units must be GeoJSON FeatureCollection");

            List<Object> units = response.jsonPath().getList("data.units.features");
            List<Object> nodes = response.jsonPath().getList("data.nodes.features");
            List<Object> edges = response.jsonPath().getList("data.edges.features");
            List<Object> pois = response.jsonPath().getList("data.pois.features");

            Assert.assertNotNull(units, "Units features required");
            Assert.assertTrue(units.size() > 0, "Units features must not be empty");
            Assert.assertNotNull(nodes, "Nodes features required");
            Assert.assertTrue(nodes.size() > 0, "Nodes features must not be empty");
            Assert.assertNotNull(edges, "Edges features required");
            Assert.assertTrue(edges.size() > 0, "Edges features must not be empty");
            Assert.assertNotNull(pois, "POIs features required");
            Assert.assertTrue(pois.size() > 0, "POIs features must not be empty");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_004 — Unreachable Target
    // ----------------------------------------------------
    @Test(priority = 4)
    public void TC004_UnreachableTarget() {
        String testId = "TC_004";
        String testName = "Unreachable Target";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("startNodeId", "node-l1-entrance");
            payload.put("targetNodeId", "node-unreachable-target-999");
            payload.put("accessibleOnly", false);

            Response response = RestAssured.given()
                    .contentType(ContentType.JSON)
                    .body(payload)
                    .when()
                    .post("/api/venues/" + VENUE_ID + "/route")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            // Application gracefully responds with HTTP 400 Bad Request on unreachable / invalid node
            Assert.assertEquals(response.statusCode(), 400, "Server must return HTTP 400 on unreachable target");
            Assert.assertFalse(response.jsonPath().getBoolean("success"), "Route success must be false");

            String errorMsg = response.jsonPath().getString("error");
            Assert.assertNotNull(errorMsg, "Error response message must exist");
            Assert.assertTrue(errorMsg.toLowerCase().contains("target") || errorMsg.toLowerCase().contains("not found"),
                    "Error should explain target destination issue: " + errorMsg);

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_005 — API / POI Integration
    // ----------------------------------------------------
    @Test(priority = 5)
    public void TC005_POIIntegration() {
        String testId = "TC_005";
        String testName = "POI Integration";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Response response = RestAssured.given()
                    .when()
                    .get("/api/venues/" + VENUE_ID + "/pois")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "success should be true");

            List<Map<String, Object>> pois = response.jsonPath().getList("data");
            Assert.assertNotNull(pois, "POIs list must not be null");
            Assert.assertTrue(pois.size() >= 5, "Expected at least 5 seeded POIs");

            Map<String, Object> firstPoi = pois.get(0);
            Assert.assertNotNull(firstPoi.get("id"), "POI id is required");
            Assert.assertNotNull(firstPoi.get("name"), "POI name is required");
            Assert.assertNotNull(firstPoi.get("category"), "POI category is required");
            Assert.assertNotNull(firstPoi.get("level_id"), "POI level_id is required");
            Assert.assertNotNull(firstPoi.get("x_meters"), "POI x_meters coordinate is required");
            Assert.assertNotNull(firstPoi.get("y_meters"), "POI y_meters coordinate is required");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_006 — Multi-Floor Navigation
    // ----------------------------------------------------
    @Test(priority = 6)
    public void TC006_MultiFloorNavigation() {
        String testId = "TC_006";
        String testName = "Multi-Floor Navigation";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("startNodeId", "node-l1-entrance");
            payload.put("targetNodeId", "node-l3-cafeteria-door");
            payload.put("accessibleOnly", false);

            Response response = RestAssured.given()
                    .contentType(ContentType.JSON)
                    .body(payload)
                    .when()
                    .post("/api/venues/" + VENUE_ID + "/route")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "Multi-floor routing must succeed");

            List<String> levelsTraversed = response.jsonPath().getList("levelsTraversed");
            Assert.assertNotNull(levelsTraversed, "levelsTraversed list required");
            Assert.assertTrue(levelsTraversed.size() >= 2, "Route must span across at least 2 floors");
            Assert.assertTrue(levelsTraversed.contains("level-metro-l1"), "Must traverse Level 1");
            Assert.assertTrue(levelsTraversed.contains("level-metro-l3"), "Must traverse Level 3");

            List<Map<String, Object>> steps = response.jsonPath().getList("steps");
            boolean hasVerticalTransition = steps.stream()
                    .anyMatch(s -> Boolean.TRUE.equals(s.get("isLevelTransition")));
            Assert.assertTrue(hasVerticalTransition, "Route must contain at least one vertical level transition step");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_007 — Accessibility Routing
    // ----------------------------------------------------
    @Test(priority = 7)
    public void TC007_AccessibilityRouting() {
        String testId = "TC_007";
        String testName = "Accessibility Routing";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("startNodeId", "node-l1-entrance");
            payload.put("targetNodeId", "node-l3-cafeteria-door");
            payload.put("accessibleOnly", true);

            Response response = RestAssured.given()
                    .contentType(ContentType.JSON)
                    .body(payload)
                    .when()
                    .post("/api/venues/" + VENUE_ID + "/route")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "Accessible route must succeed");
            Assert.assertTrue(response.jsonPath().getBoolean("accessible"), "accessible flag must be true");

            // Verify no stairs are traversed in wheelchair accessible mode
            List<Map<String, Object>> waypoints = response.jsonPath().getList("waypoints");
            for (Map<String, Object> wp : waypoints) {
                String nodeType = (String) wp.get("nodeType");
                Assert.assertNotEquals(nodeType, "stair_landing", "Wheelchair accessible route must not traverse stairs");
            }

            // Verify elevator is used for floor transition
            List<Map<String, Object>> steps = response.jsonPath().getList("steps");
            boolean usesElevator = steps.stream()
                    .anyMatch(s -> "elevator".equalsIgnoreCase((String) s.get("transitionType")) ||
                                   String.valueOf(s.get("instruction")).toLowerCase().contains("elevator"));
            Assert.assertTrue(usesElevator, "Accessible route must utilize elevator for level transition");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_008 — POI Search
    // ----------------------------------------------------
    @Test(priority = 8)
    public void TC008_POISearch() {
        String testId = "TC_008";
        String testName = "POI Search";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Response response = RestAssured.given()
                    .queryParam("q", "pharmacy")
                    .when()
                    .get("/api/venues/" + VENUE_ID + "/pois")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "success should be true");

            List<Map<String, Object>> searchResults = response.jsonPath().getList("data");
            Assert.assertNotNull(searchResults, "Search results must not be null");
            Assert.assertTrue(searchResults.size() >= 1, "Expected matching pharmacy POI");

            Map<String, Object> matchedPoi = searchResults.get(0);
            String name = (String) matchedPoi.get("name");
            Assert.assertTrue(name.toLowerCase().contains("pharmacy"), "POI name should contain 'pharmacy'");
            Assert.assertNotNull(matchedPoi.get("x_meters"), "POI x coordinate required");
            Assert.assertNotNull(matchedPoi.get("y_meters"), "POI y coordinate required");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_009 — Floor Selection
    // ----------------------------------------------------
    @Test(priority = 9)
    public void TC009_FloorSelection() {
        String testId = "TC_009";
        String testName = "Floor Selection";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            Response response = RestAssured.given()
                    .when()
                    .get("/api/venues/" + VENUE_ID + "/levels/" + LEVEL_2_ID + "/map")
                    .then()
                    .extract().response();

            long time = System.currentTimeMillis() - start;

            Assert.assertEquals(response.statusCode(), 200, "Expected HTTP 200");
            Assert.assertTrue(response.jsonPath().getBoolean("success"), "success should be true");

            String levelId = response.jsonPath().getString("data.level.id");
            Assert.assertEquals(levelId, LEVEL_2_ID, "Selected level ID must match");

            int ordinal = response.jsonPath().getInt("data.level.ordinal");
            Assert.assertEquals(ordinal, 1, "Level 2 ordinal should be 1");

            String shortName = response.jsonPath().getString("data.level.short_name");
            Assert.assertEquals(shortName, "L2", "Short name should be 'L2'");

            List<Object> units = response.jsonPath().getList("data.units.features");
            Assert.assertTrue(units.size() > 0, "Level 2 must contain unit geometries");

            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    // ----------------------------------------------------
    // TC_010 — Invalid Request Handling
    // ----------------------------------------------------
    @Test(priority = 10)
    public void TC010_InvalidRequestHandling() {
        String testId = "TC_010";
        String testName = "Invalid Request Handling";
        System.out.println("[" + testId + "] " + testName);
        System.out.println("--------------------------------------------------------");
        long start = System.currentTimeMillis();

        try {
            // Test 1: Non-existent venue details
            Response res404 = RestAssured.given()
                    .when()
                    .get("/api/venues/non-existent-venue-xyz-404")
                    .then()
                    .extract().response();

            Assert.assertEquals(res404.statusCode(), 404, "Non-existent venue must return HTTP 404");
            Assert.assertFalse(res404.jsonPath().getBoolean("success"), "success must be false");
            Assert.assertEquals(res404.jsonPath().getString("error"), "Venue not found");

            // Test 2: Invalid route request with empty body
            Response resEmptyRoute = RestAssured.given()
                    .contentType(ContentType.JSON)
                    .body("{}")
                    .when()
                    .post("/api/venues/" + VENUE_ID + "/route")
                    .then()
                    .extract().response();

            // Handled gracefully by server (either auto-selects entrance or returns 400 without crashing)
            Assert.assertTrue(resEmptyRoute.statusCode() == 200 || resEmptyRoute.statusCode() == 400,
                    "Invalid route request handled gracefully with expected HTTP status code");

            long time = System.currentTimeMillis() - start;
            recordPass(testId, testName, time);
        } catch (Throwable t) {
            recordFail(testId, testName, System.currentTimeMillis() - start, t.getMessage());
            throw t;
        }
    }

    @AfterClass
    public void cleanup() {
        System.out.println("\n========================================================");
        System.out.println("                  TEST SUMMARY");
        System.out.println("========================================================\n");

        for (TestResultRecord r : testResults) {
            System.out.printf("%-8s%-32s%s\n", r.testId, r.testName, r.status);
        }

        int total = testResults.size();
        double passRate = total > 0 ? ((double) passCount / total) * 100.0 : 0.0;

        System.out.println("\n--------------------------------------------------------");
        System.out.printf("Total Tests : %d\n", total);
        System.out.printf("Passed      : %d\n", passCount);
        System.out.printf("Failed      : %d\n", failCount);
        System.out.printf("Skipped     : %d\n", skipCount);
        System.out.printf("Pass Rate   : %.0f%%\n", passRate);
        System.out.println("--------------------------------------------------------\n");
        System.out.println("        OpenNav TestNG Testing Completed");
        System.out.println("========================================================\n");
    }

    private static void recordPass(String testId, String testName, long timeMs) {
        passCount++;
        testResults.add(new TestResultRecord(testId, testName, "PASS", timeMs, null));
        System.out.println("PASS - " + testId);
        System.out.println("Execution Time: " + timeMs + " ms\n");
    }

    private static void recordFail(String testId, String testName, long timeMs, String reason) {
        failCount++;
        testResults.add(new TestResultRecord(testId, testName, "FAIL", timeMs, reason));
        System.out.println("FAIL - " + testId);
        System.out.println("Reason: " + reason);
        System.out.println("Execution Time: " + timeMs + " ms\n");
    }
}
