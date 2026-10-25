import { useAuth } from "@clerk/expo";
import { HealthResponse } from "@fit/shared";
import { useEffect, useState, type ReactNode } from "react";
import { Divider } from "@/components/divider";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { equipmentSummary } from "@/features/equipment/equipment-summary";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { genderLabel } from "@/features/user/components/form/fields/user-gender-field";
import { goalLabel } from "@/features/user/components/form/fields/user-goal-field";
import { injuryLabel } from "@/features/user/components/form/fields/user-injuries-field";
import { SignOutModal, signOutWarning } from "@/features/workouts/components/sign-out-modal";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { useApi } from "@/api";

export default function ProfileView() {
  const { signOut } = useAuth();
  const { user } = useCurrentUser();
  const logbook = useLogbook();
  const { showToast } = useToast();
  // What signing out would lose, while the user confirms; null when not asking
  const [signOutWarningText, setSignOutWarningText] = useState<string | null>(null);

  // Clears the phone first, so the next person on a shared phone can't see this user's
  // Workouts; if that fails the user stays signed in
  const signOutAndClear = async () => {
    try {
      await logbook.clear();
    } catch (err) {
      showToast("Couldn't sign out", { error: err });
      return;
    }
    setSignOutWarningText(null);
    await signOut();
  };

  // Counts the Pending Workouts on the phone now, so the warning is never out of date
  const handleSignOut = async () => {
    let warning: string | null;
    try {
      warning = signOutWarning(await logbook.pendingCount(), logbook.workout !== null);
    } catch (err) {
      showToast("Couldn't sign out", { error: err });
      return;
    }
    if (warning) setSignOutWarningText(warning);
    else await signOutAndClear();
  };

  // The layout only renders this screen once the user is loaded and onboarded
  if (!user?.onboardedAt) return null;
  const { profile } = user;
  const equipment = user.equipmentProfiles.find((p) => p.isPrimary);

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack spacing={5}>
        <Section label="Training">
          <Row label="Goal" value={profile.goal && goalLabel(profile.goal)} />
          <Row label="Days per week" value={profile.daysPerWeek} />
          <Row label="Equipment" value={equipmentSummary(equipment)} />
          <Row
            label="Injuries"
            value={profile.injuries?.length ? profile.injuries.map(injuryLabel).join(", ") : "None"}
          />
        </Section>
        <Divider />
        <Section label="Profile">
          <Row label="Gender" value={profile.gender && genderLabel(profile.gender)} />
          <Row label="Age" value={profile.birthYear && `${new Date().getFullYear() - profile.birthYear}`} />
          <Row label="Height" value={profile.heightCm && `${profile.heightCm} cm`} />
          <Row label="Weight" value={profile.weightKg && `${profile.weightKg} kg`} />
          <Text size="sm" color="muted">
            Member since {new Date(user.onboardedAt).toLocaleDateString()}
          </Text>
        </Section>
        <Stack spacing={2}>
          <LoadingButton label="Edit profile" action="secondary" icon="user" href="/onboarding" />
          <LoadingButton label="Sign out" action="default" icon="signOut" onPress={handleSignOut} />
        </Stack>
        {__DEV__ ? <DevelopmentSection /> : null}
      </Stack>
      <SignOutModal
        isOpen={signOutWarningText !== null}
        warning={signOutWarningText ?? ""}
        onClose={() => setSignOutWarningText(null)}
        onConfirm={signOutAndClear}
      />
    </Screen>
  );
}

// Only in development builds: whether the API and database are reachable, and the components styleguide
function DevelopmentSection() {
  const api = useApi();
  const [status, setStatus] = useState("Checking API…");

  useEffect(() => {
    api("/health")
      .then((json) => {
        const health = HealthResponse.parse(json);
        setStatus(`API ${health.status} · DB ${health.db}`);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));
  }, [api]);

  return (
    <>
      <Divider />
      <Section label="Development">
        <Row label="Status" value={status} />
        <LoadingButton label="Components" action="secondary" icon="settings" href="/profile/styleguide" />
      </Section>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={3}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </Stack>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <HStack justify="between" spacing={4}>
      <Text color="muted">{label}</Text>
      <Text weight="semiBold" style={{ flexShrink: 1, textAlign: "right" }}>
        {value || "—"}
      </Text>
    </HStack>
  );
}
