import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useThemeContext } from '@/contexts/ThemeContext';
import { FiMoon, FiSun } from 'react-icons/fi';

export function Settings() {
  const { theme, setTheme } = useThemeContext();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage your public profile and account settings.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Change your password and manage two-factor authentication.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Configure your notification preferences.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
                <Label htmlFor="theme-switch" className="flex items-center gap-2">
                    <FiSun />
                    <span>Light</span>
                </Label>
                <Switch 
                    id="theme-switch" 
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
                <Label htmlFor="theme-switch" className="flex items-center gap-2">
                    <FiMoon />
                    <span>Dark</span>
                </Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
