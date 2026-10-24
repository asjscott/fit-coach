import { useEffect, useState } from "react";
import { HealthResponse } from "@fit/shared";
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { ButtonGroup } from "@/components/button";
import { Card } from "@/components/card";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { ForgottenWorkoutModal } from "@/features/workouts/components/forgotten-workout-modal";
import { SignOutModal, signOutWarning } from "@/features/workouts/components/sign-out-modal";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { goalLabel } from "@/features/user/components/form/fields/user-goal-field";
import { injuryLabel } from "@/features/user/components/form/fields/user-injuries-field";
import { genderLabel } from "@/features/user/components/form/fields/user-gender-field";
import { spacing } from "@/theme";
import { useApi } from "@/api";

export default function Home() {
  const { signOut } = useAuth();
  const { user } = useCurrentUser();
  const api = useApi();
  const logbook = useLogbook();
  const { showToast } = useToast();
  const [status, setStatus] = useState("Checking API…");
  const [starting, setStarting] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  // What signing out would lose, while the user confirms; null when not asking
  const [signOutWarningText, setSignOutWarningText] = useState<string | null>(null);
  const { isLoaded, isStale } = logbook;

  // A forgotten Workout must be finished or discarded before the user carries on
  useEffect(() => {
    if (isLoaded) isStale().then(setForgotten, () => {});
  }, [isLoaded, isStale]);

  // Resuming just opens the Workout, unless it was forgotten; starting saves a new one
  // on the phone first
  const handleWorkout = async () => {
    if (logbook.workout && (await isStale())) {
      setForgotten(true);
      return;
    }
    if (!logbook.workout) {
      setStarting(true);
      try {
        await logbook.start();
      } catch (err) {
        showToast("Couldn't start a Workout", { error: err });
        return;
      } finally {
        setStarting(false);
      }
    }
    router.push("/workout");
  };

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

  useEffect(() => {
    api("/health")
      .then((json) => {
        const health = HealthResponse.parse(json);
        setStatus(`API ${health.status} · DB ${health.db}`);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));
  }, [api]);

  // The layout only renders this screen once the user is loaded and onboarded
  if (!user?.onboardedAt) return null;
  const { profile } = user;

  return (
    <Screen scroll>
      <Stack spacing={6} flex>
        <Heading size="3xl">Fit Coach</Heading>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            YOUR PLAN
          </Text>
          <Text size="xl" weight="bold">
            {profile.goal && goalLabel(profile.goal)}
          </Text>
          <Text color="textMuted">{profile.daysPerWeek} training days per week</Text>
        </Card>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            PROFILE
          </Text>
          <Row label="Gender" value={profile.gender && genderLabel(profile.gender)} />
          <Row label="Age" value={profile.birthYear && `${new Date().getFullYear() - profile.birthYear}`} />
          <Row label="Height" value={profile.heightCm && `${profile.heightCm} cm`} />
          <Row label="Weight" value={profile.weightKg && `${profile.weightKg} kg`} />
          <Row
            label="Injuries"
            value={profile.injuries?.length ? profile.injuries.map(injuryLabel).join(", ") : "None"}
          />
          <Text size="xs" color="textSubtle">
            Member since {new Date(user.onboardedAt).toLocaleDateString()}
          </Text>
        </Card>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            STATUS
          </Text>
          <Text weight="semiBold">{status}</Text>
        </Card>
      </Stack>
      <ButtonGroup space={2} style={{ marginTop: spacing[6] }}>
        <LoadingButton
          label={logbook.workout ? "Resume workout" : "Start workout"}
          icon="dumbbell"
          loading={!logbook.isLoaded || starting}
          onPress={handleWorkout}
        />
        <LoadingButton label="History" action="secondary" icon="calendar" href="/history" />
        <LoadingButton label="Exercises" action="secondary" icon="search" href="/exercises" />
        <LoadingButton label="Edit profile" action="secondary" icon="user" href="/onboarding" />
        {__DEV__ && <LoadingButton label="Components" action="secondary" icon="settings" href="/styleguide" />}
        <LoadingButton label="Sign out" action="default" icon="signOut" onPress={handleSignOut} />
      </ButtonGroup>
      <ForgottenWorkoutModal isOpen={forgotten} onDone={() => setForgotten(false)} />
      <SignOutModal
        isOpen={signOutWarningText !== null}
        warning={signOutWarningText ?? ""}
        onClose={() => setSignOutWarningText(null)}
        onConfirm={signOutAndClear}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <HStack justify="between" spacing={4}>
      <Text color="textMuted">{label}</Text>
      <Text weight="semiBold" style={{ flexShrink: 1, textAlign: "right" }}>
        {value || "—"}
      </Text>
    </HStack>
  );
}
