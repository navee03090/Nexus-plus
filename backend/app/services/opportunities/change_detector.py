"""
Opportunity Change Detector (Section 17 & 40).
Identifies modifications in canonical opportunities when subsequent announcements are ingested.
"""
from datetime import timezone
from typing import List, Dict, Any
import dateutil.parser


class ChangeDetector:
    """Detects deadline extensions, venue changes, date changes, and cancellations."""

    @classmethod
    def detect_changes(
        cls,
        existing_opp: Any,
        incoming_data: Dict[str, Any],
        source_item_id: str
    ) -> List[Dict[str, Any]]:
        changes: List[Dict[str, Any]] = []

        # 1. Deadline changes
        if incoming_data.get("registration_deadline"):
            try:
                new_dl = dateutil.parser.parse(str(incoming_data["registration_deadline"]))
                old_dl = existing_opp.registration_deadline
                if old_dl:
                    if old_dl.tzinfo is None:
                        old_dl = old_dl.replace(tzinfo=timezone.utc)
                    if new_dl.tzinfo is None:
                        new_dl = new_dl.replace(tzinfo=timezone.utc)

                    if abs((new_dl - old_dl).total_seconds()) > 3600:  # Changed by more than 1 hour
                        change_type = "deadline_extension" if new_dl > old_dl else "deadline_shortened"
                        changes.append({
                            "field_name": "registration_deadline",
                            "old_value": old_dl.isoformat(),
                            "new_value": new_dl.isoformat(),
                            "source_item_id": source_item_id,
                            "change_type": change_type,
                        })
            except Exception:
                pass

        # 2. Venue changes
        new_venue = (incoming_data.get("venue") or "").strip()
        old_venue = (existing_opp.venue or "").strip()
        if new_venue and old_venue and new_venue.lower() != old_venue.lower():
            changes.append({
                "field_name": "venue",
                "old_value": old_venue,
                "new_value": new_venue,
                "source_item_id": source_item_id,
                "change_type": "venue_change",
            })

        # 3. Registration URL changes
        new_url = (incoming_data.get("registration_url") or "").strip()
        old_url = (existing_opp.registration_url or "").strip()
        if new_url and old_url and new_url != old_url:
            changes.append({
                "field_name": "registration_url",
                "old_value": old_url,
                "new_value": new_url,
                "source_item_id": source_item_id,
                "change_type": "details_update",
            })

        # 4. Status update (e.g. cancelled / postponed)
        inc_status = (incoming_data.get("status") or "").lower().strip()
        if inc_status in ("cancelled", "postponed") and (existing_opp.status or "").lower() != inc_status:
            changes.append({
                "field_name": "status",
                "old_value": existing_opp.status,
                "new_value": inc_status,
                "source_item_id": source_item_id,
                "change_type": inc_status,
            })

        return changes
