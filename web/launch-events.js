const eventNames = new Set([
  "onecv_command_generated",
  "onecv_command_copied",
  "onecv_setup_preview_completed",
]);
const placements = new Set(["1cv_launch", "1cv_profile_guide"]);

// Website handoff signals are not profile creation or CLI activation.
export function createLaunchTracker({ getConsent, emit, location, navigator }) {
  const sent = new Set();
  return (name) => {
    try {
      if (!eventNames.has(name) || sent.has(name) || getConsent() !== "granted") return false;
      if (!["1cv.app", "www.1cv.app"].includes(location.hostname)) return false;
      if (navigator.globalPrivacyControl || ["1", "yes"].includes(navigator.doNotTrack)) return false;
      const query = new URLSearchParams(location.search);
      if (query.get("onecv_qa") === "1" || query.get("launch_qa") === "1") return false;
      const source = query.get("utm_source");
      const content = query.get("utm_content");
      emit(name, {
        launch_source: ["producthunt", "daniel_portfolio"].includes(source) ? source : "other",
        launch_campaign: query.get("utm_campaign") === "launch_2026_11" ? "launch_2026_11" : "other",
        launch_placement: placements.has(content) ? content : "other",
      });
      sent.add(name);
      return true;
    } catch {
      // Measurement must never interrupt profile setup or copying.
      return false;
    }
  };
}
