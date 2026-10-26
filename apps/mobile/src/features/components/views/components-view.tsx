import { zodResolver } from "@hookform/resolvers/zod";
import { Goal, InjuryTag, UserProfile } from "@fit/shared";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import Plus from "lucide-react-native/icons/plus";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetIcon,
  ActionsheetItem,
  ActionsheetItemText,
} from "@/components/actionsheet";
import { Alert, AlertIcon, AlertText } from "@/components/alert";
import { Badge, BadgeIcon, BadgeText } from "@/components/badge";
import { Box } from "@/components/box";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "@/components/button";
import { Card } from "@/components/card";
import { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from "@/components/checkbox";
import { Chip } from "@/components/chip";
import { Divider } from "@/components/divider";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/form-control";
import { Grid, GridItem } from "@/components/grid";
import { Heading } from "@/components/heading";
import {
  FormProvider,
  RHFChipSelect,
  RHFMultiSelect,
  RHFPasswordField,
  RHFRadioGroup,
  RHFSelect,
  RHFSlider,
  RHFSwitch,
  RHFTextField,
  type Option,
} from "@/components/hook-form";
import { Icon } from "@/components/icons";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/modal";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from "@/components/radio";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { Skeleton, SkeletonText } from "@/components/skeleton";
import { Slider, SliderFilledTrack, SliderThumb, SliderTrack } from "@/components/slider";
import { Spinner } from "@/components/spinner";
import { HStack, Stack } from "@/components/stack";
import { Stat } from "@/components/stat";
import { Switch } from "@/components/switch";
import { Text } from "@/components/text";
import { Textarea, TextareaInput } from "@/components/textarea";
import { Toast } from "@/components/toast";
import { useTheme, type ColorToken, type ThemePreference } from "@/theme";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];

const goalOptions: Option[] = Goal.options.map((value) => ({
  value,
  label: { lose_fat: "Lose fat", build_muscle: "Build muscle", recomp: "Recomp", athletic: "Athletic" }[value],
}));

const injuryOptions: Option[] = InjuryTag.options.map((value) => ({
  value,
  label: value.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
}));

// Demo form built from the shared API schema, so the rules match the server
const DemoSchema = UserProfile.pick({
  heightCm: true,
  weightKg: true,
  goal: true,
  daysPerWeek: true,
  injuries: true,
});

// Dev-only reference of every component and variant
export default function ComponentsView() {
  const { colors, preference, setPreference } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [checked, setChecked] = useState<string[]>(["email"]);
  const [radio, setRadio] = useState("kg");
  const [switchOn, setSwitchOn] = useState(true);
  const [slider, setSlider] = useState(40);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(DemoSchema),
    defaultValues: { daysPerWeek: 3, injuries: [] },
  });

  const onSubmit = form.handleSubmit(
    () => setToast({ message: "Profile is valid", type: "success" }),
    () => setToast({ message: "Fix the highlighted fields", type: "error" }),
  );

  const fakeSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <>
      <Screen scroll edges={["bottom"]}>
        <Stack spacing={10}>
          <Section title="Theme">
            <HStack spacing={2}>
              {themeOptions.map((option) => (
                <Chip
                  key={option}
                  label={option[0].toUpperCase() + option.slice(1)}
                  selected={preference === option}
                  onPress={() => setPreference(option)}
                />
              ))}
            </HStack>
          </Section>

          <Section title="Text">
            <Heading size="3xl">Heading 3xl</Heading>
            <Heading size="xl">Heading xl</Heading>
            <Heading size="md">Heading md</Heading>
            <Text size="lg">Text lg</Text>
            <Text>Text md (default)</Text>
            <Text size="sm" color="muted">
              Text sm muted
            </Text>
            <Text size="xs" color="subtle">
              Text xs subtle
            </Text>
            <Text bold>Bold</Text>
            <Text italic underline>
              Italic underline
            </Text>
            <Text size="4xl" weight="extraBold">
              142.5 kg
            </Text>
          </Section>

          <Section title="Colours">
            <Grid columns={4} gap={2}>
              {(Object.keys(colors) as ColorToken[]).map((name) => (
                <GridItem key={name}>
                  <Box rounded="sm" bg={name} style={{ height: 40, borderWidth: 1, borderColor: colors.line }} />
                  <Text size="2xs" color="subtle" isTruncated>
                    {name}
                  </Text>
                </GridItem>
              ))}
            </Grid>
          </Section>

          <Section title="Buttons">
            {(["primary", "secondary", "positive", "negative", "default"] as const).map((action) => (
              <HStack key={action} spacing={2}>
                <Button action={action} size="sm">
                  <ButtonText>{action}</ButtonText>
                </Button>
                <Button action={action} variant="outline" size="sm">
                  <ButtonText>Outline</ButtonText>
                </Button>
                <Button action={action} variant="link" size="sm">
                  <ButtonText>Link</ButtonText>
                </Button>
              </HStack>
            ))}
            <HStack spacing={2} wrap="wrap">
              {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <Button key={size} size={size}>
                  <ButtonText>{size}</ButtonText>
                </Button>
              ))}
            </HStack>
            <Button>
              <ButtonIcon as={Plus} />
              <ButtonText>With icon</ButtonText>
            </Button>
            <Button disabled>
              <ButtonText>Disabled</ButtonText>
            </Button>
            <LoadingButton label="Loading button" icon="check" loading={saving} onPress={fakeSave} />
          </Section>

          <Section title="Stats">
            <SectionLabel right="Mon 20 – Sun 26">This week</SectionLabel>
            <HStack spacing={4}>
              <Stat value="6,420" unit="kg" label="Volume" />
              <Stat value="38" label="Sets" />
              <Stat value="2:14" unit="h" label="Time" />
            </HStack>
            <HStack spacing={4}>
              <Stat size="4xl" value="48:12" label="Elapsed" />
              <Stat size="4xl" value="142.5" unit="kg" label="Top set" />
            </HStack>
          </Section>

          <Section title="Cards">
            <Card>
              <SectionLabel>Section (default)</SectionLabel>
              <Text color="muted">A hairline above, no box. Sections of a screen are separated this way.</Text>
            </Card>
            <Card>
              <SectionLabel>Another section</SectionLabel>
              <Text color="muted">Volume 1,240 kg · 12 Sets · 48 min</Text>
            </Card>
            <Card variant="filled">
              <Heading size="sm">Filled</Heading>
            </Card>
            <Card selected={false}>
              <Heading size="sm">Choice</Heading>
            </Card>
            <Card selected>
              <Heading size="sm">Chosen</Heading>
            </Card>
          </Section>

          <Section title="Badges">
            <HStack spacing={2} wrap="wrap">
              {(["success", "warning", "error", "info", "muted"] as const).map((action) => (
                <Badge key={action} action={action}>
                  <BadgeText>{action}</BadgeText>
                </Badge>
              ))}
            </HStack>
            <HStack spacing={2}>
              <Badge action="success" variant="outline" size="lg">
                <BadgeIcon name="check" />
                <BadgeText>PR</BadgeText>
              </Badge>
              <Badge action="info" size="sm">
                <BadgeText>New</BadgeText>
              </Badge>
            </HStack>
          </Section>

          <Section title="Alerts">
            {(["success", "warning", "error", "info"] as const).map((action) => (
              <Alert key={action} action={action}>
                <AlertIcon />
                <AlertText>This is a {action} alert.</AlertText>
              </Alert>
            ))}
            <Alert action="muted" variant="outline">
              <AlertIcon />
              <AlertText>Outline variant.</AlertText>
            </Alert>
          </Section>

          <Section title="Feedback">
            <HStack spacing={4}>
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </HStack>
            <Progress value={65}>
              <ProgressFilledTrack />
            </Progress>
            <HStack spacing={3}>
              <Skeleton variant="circular" style={{ width: 48, height: 48 }} />
              <Box flex>
                <SkeletonText _lines={3} />
              </Box>
            </HStack>
            <Button action="secondary" onPress={() => setToast({ message: "Workout saved", type: "success" })}>
              <ButtonText>Show toast</ButtonText>
            </Button>
          </Section>

          <Section title="Overlays">
            <Button action="secondary" onPress={() => setModalOpen(true)}>
              <ButtonText>Open modal</ButtonText>
            </Button>
            <Button action="secondary" onPress={() => setSheetOpen(true)}>
              <ButtonText>Open action sheet</ButtonText>
            </Button>
          </Section>

          <Section title="Inputs">
            <FormControl isRequired>
              <FormControlLabel>
                <FormControlLabelText>Email</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputSlot>
                  <InputIcon name="user" />
                </InputSlot>
                <InputField placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              </Input>
              <FormControlHelper>
                <FormControlHelperText>We never share it.</FormControlHelperText>
              </FormControlHelper>
            </FormControl>
            <FormControl isInvalid>
              <FormControlLabel>
                <FormControlLabelText>Weight (kg)</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField defaultValue="heavy" />
              </Input>
              <FormControlError>
                <FormControlErrorIcon />
                <FormControlErrorText>Must be a number</FormControlErrorText>
              </FormControlError>
            </FormControl>
            <Input variant="rounded" size="md">
              <InputSlot>
                <InputIcon name="search" />
              </InputSlot>
              <InputField placeholder="Rounded, md" />
            </Input>
            <Input variant="underlined" size="md">
              <InputField placeholder="Underlined" />
            </Input>
            <Textarea>
              <TextareaInput placeholder="Notes about today's session…" />
            </Textarea>
          </Section>

          <Section title="Selection">
            <CheckboxGroup value={checked} onChange={setChecked}>
              <Checkbox value="email">
                <CheckboxIndicator>
                  <CheckboxIcon />
                </CheckboxIndicator>
                <CheckboxLabel>Email reminders</CheckboxLabel>
              </Checkbox>
              <Checkbox value="push">
                <CheckboxIndicator>
                  <CheckboxIcon />
                </CheckboxIndicator>
                <CheckboxLabel>Push notifications</CheckboxLabel>
              </Checkbox>
            </CheckboxGroup>
            <Divider />
            <RadioGroup value={radio} onChange={setRadio}>
              <Radio value="kg">
                <RadioIndicator>
                  <RadioIcon />
                </RadioIndicator>
                <RadioLabel>Kilograms</RadioLabel>
              </Radio>
              <Radio value="lb">
                <RadioIndicator>
                  <RadioIcon />
                </RadioIndicator>
                <RadioLabel>Pounds</RadioLabel>
              </Radio>
            </RadioGroup>
            <Divider />
            <HStack justify="between">
              <Text>Rest timer sounds</Text>
              <Switch value={switchOn} onValueChange={setSwitchOn} />
            </HStack>
            <Divider />
            <HStack justify="between">
              <Text>Intensity</Text>
              <Text weight="semiBold" color="accent">
                {slider}%
              </Text>
            </HStack>
            <Slider value={slider} onChange={setSlider}>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Section>

          <Section title="Hook form">
            <Text size="sm" color="muted">
              Validated with the shared UserProfile schema. Submit empty to see errors.
            </Text>
            <FormProvider form={form}>
              <Stack spacing={5}>
                <HStack spacing={3} align="start">
                  <Box flex>
                    <RHFTextField name="heightCm" label="Height (cm)" numeric required />
                  </Box>
                  <Box flex>
                    <RHFTextField name="weightKg" label="Weight (kg)" numeric required />
                  </Box>
                </HStack>
                <RHFSelect name="goal" label="Goal" options={goalOptions} required />
                <RHFSlider name="daysPerWeek" label="Training days" min={2} max={6} formatValue={(v) => `${v} days`} />
                <RHFChipSelect name="injuries" label="Injuries (chips)" options={injuryOptions} />
                <RHFMultiSelect name="injuries" label="Injuries (multi-select)" options={injuryOptions} />
                <RHFRadioGroup name="goal" label="Goal (radio)" options={goalOptions} />
                <RHFPasswordField name="password" label="Password (unvalidated demo)" />
                <RHFSwitch name="reminders" label="Workout reminders" />
                <LoadingButton label="Validate" onPress={onSubmit} />
              </Stack>
            </FormProvider>
          </Section>

          <Section title="Icons">
            <HStack spacing={4} wrap="wrap">
              {(["dumbbell", "flame", "target", "weight", "height", "calendar", "clock", "user"] as const).map(
                (name) => (
                  <Icon key={name} name={name} color="accent" />
                ),
              )}
            </HStack>
          </Section>
        </Stack>
      </Screen>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">End workout?</Heading>
            <ModalCloseButton />
          </ModalHeader>
          <ModalBody>
            <Text color="muted">Your sets so far will be saved.</Text>
          </ModalBody>
          <ModalFooter>
            <Button action="default" size="sm" onPress={() => setModalOpen(false)}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="negative" size="sm" onPress={() => setModalOpen(false)}>
              <ButtonText>End</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Actionsheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ButtonGroup space={0}>
            <ActionsheetItem onPress={() => setSheetOpen(false)}>
              <ActionsheetIcon name="plus" />
              <ActionsheetItemText>Add exercise</ActionsheetItemText>
            </ActionsheetItem>
            <ActionsheetItem onPress={() => setSheetOpen(false)}>
              <ActionsheetIcon name="clock" />
              <ActionsheetItemText>Start rest timer</ActionsheetItemText>
            </ActionsheetItem>
            <ActionsheetItem onPress={() => setSheetOpen(false)}>
              <ActionsheetIcon name="trash" />
              <ActionsheetItemText color="danger">Delete workout</ActionsheetItemText>
            </ActionsheetItem>
          </ButtonGroup>
        </ActionsheetContent>
      </Actionsheet>

      <Toast isVisible={!!toast} message={toast?.message ?? ""} type={toast?.type} onHide={() => setToast(null)} />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={3}>
      <Heading size="lg">{title}</Heading>
      <Divider />
      {children}
    </Stack>
  );
}
