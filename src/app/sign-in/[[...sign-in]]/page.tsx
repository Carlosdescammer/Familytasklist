import { SignIn } from '@clerk/nextjs';
import { Container, Stack, Title, Text } from '@mantine/core';

export default function SignInPage() {
  return (
    <Container size="xs" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
      <Stack gap="xl" align="center">
        <div style={{ textAlign: 'center' }}>
          <Title order={1} size="2.5rem" mb="sm">
            Welcome Back
          </Title>
          <Text c="dimmed" size="lg">
            Sign in to access your family dashboard
          </Text>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </Stack>
    </Container>
  );
}
