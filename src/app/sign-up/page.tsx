import { SignUp } from '@clerk/nextjs';
import { Container, Stack, Title, Text } from '@mantine/core';

export default function SignUpPage() {
  return (
    <Container size="xs" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
      <Stack gap="xl" align="center">
        <div style={{ textAlign: 'center' }}>
          <Title order={1} size="2.5rem" mb="sm">
            Create Your Account
          </Title>
          <Text c="dimmed" size="lg">
            Join FamilyList and start organizing your family life
          </Text>
        </div>
        
        <SignUp 
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
        />
      </Stack>
    </Container>
  );
}
