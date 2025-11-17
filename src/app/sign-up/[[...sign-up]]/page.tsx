import { SignUp } from '@clerk/nextjs';
import { Container, Stack, Title, Text } from '@mantine/core';

export default function SignUpPage() {
  return (
    <Container size="xs" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
      <Stack gap="xl" align="center">
        <div style={{ textAlign: 'center' }}>
          <Title order={1} size="2.5rem" mb="sm">
            Create Your Family Account
          </Title>
          <Text c="dimmed" size="lg">
            Start by creating your account - you'll set up your family name next
          </Text>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
            },
            variables: {
              colorPrimary: '#228be6',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl="/onboarding"
        />
      </Stack>
    </Container>
  );
}
