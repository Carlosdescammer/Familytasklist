'use client';

import { useState, useEffect } from 'react';
import { Select, Badge, Group, Text, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUsers, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface UserFamily {
  id: string;
  name: string;
  roleInFamily: string;
  isAdmin: boolean;
  isActive: boolean;
}

export function FamilySwitcher() {
  const router = useRouter();
  const [families, setFamilies] = useState<UserFamily[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      const res = await fetch('/api/user/families');
      if (!res.ok) throw new Error('Failed to fetch families');

      const data = await res.json();
      setFamilies(data.families || []);
      setActiveFamilyId(data.activeFamilyId);
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchFamily = async (familyId: string | null) => {
    if (!familyId || familyId === activeFamilyId) return;

    try {
      setSwitching(true);
      const res = await fetch('/api/user/switch-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });

      if (!res.ok) throw new Error('Failed to switch family');

      const data = await res.json();

      setActiveFamilyId(familyId);

      notifications.show({
        title: 'Family Switched',
        message: `Now viewing ${data.familyName} as ${data.roleInFamily}`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      // Refresh the page to update all data
      router.refresh();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to switch family',
        color: 'red',
      });
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return <Loader size="sm" />;
  }

  // Don't show switcher if user only belongs to one family
  if (families.length <= 1) {
    return null;
  }

  const activeFamily = families.find((f) => f.id === activeFamilyId);

  return (
    <Select
      leftSection={<IconUsers size={16} />}
      value={activeFamilyId}
      onChange={handleSwitchFamily}
      data={families.map((family) => ({
        value: family.id,
        label: `${family.name} (${family.roleInFamily})`,
      }))}
      placeholder="Select family"
      disabled={switching}
      size="sm"
      styles={{
        input: {
          fontWeight: 500,
        },
      }}
      renderOption={({ option }) => {
        const family = families.find((f) => f.id === option.value);
        if (!family) return option.label;

        return (
          <Group gap="sm" wrap="nowrap">
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {family.name}
              </Text>
              <Group gap="xs" mt={2}>
                <Badge size="xs" variant="dot" color="blue">
                  {family.roleInFamily}
                </Badge>
                {family.isAdmin && (
                  <Badge size="xs" variant="light" color="grape">
                    Admin
                  </Badge>
                )}
              </Group>
            </div>
            {family.isActive && <IconCheck size={18} color="green" />}
          </Group>
        );
      }}
    />
  );
}
