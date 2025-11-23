'use client';

import { useState } from 'react';
import { Title, Text, Stack, Tabs } from '@mantine/core';
import { IconChefHat, IconMessages } from '@tabler/icons-react';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import { RecipesTab } from '@/components/community/RecipesTab';
import ForumsTab from '@/components/community/ForumsTab';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<string | null>('recipes');

  return (
    <AppLayout>
      <PageAccessGuard pageName="community">
        <Stack gap="lg">
          <div>
            <Title order={1}>Community</Title>
            <Text c="dimmed" size="sm">
              Discover recipes and connect with families around the world
            </Text>
          </div>

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="recipes" leftSection={<IconChefHat size={16} />}>
                Recipes
              </Tabs.Tab>
              <Tabs.Tab value="forums" leftSection={<IconMessages size={16} />}>
                Forums
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="recipes" pt="lg">
              <RecipesTab />
            </Tabs.Panel>

            <Tabs.Panel value="forums" pt="lg">
              <ForumsTab />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </PageAccessGuard>
    </AppLayout>
  );
}
