import appLogo from "@/assets/rcube.svg";
import { ModeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

/**
 * Header component containing the main navigation and theme toggle
 *
 * Features:
 * - Application logo and branding
 * - Navigation menu with links
 * - Theme toggle for dark/light mode
 * - Responsive design with proper spacing
 *
 * @returns JSX element representing the application header
 */
export function Header() {
  return (
    <header className="w-full border-b bg-background text-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Main navigation menu */}
          <NavigationMenu className="max-w-full justify-start">
            <NavigationMenuList>
              {/* Logo/brand link */}
              <NavigationMenuItem>
                <NavigationMenuLink href="/" className="font-bold text-lg">
                  <img
                    src={appLogo}
                    alt="App Logo"
                    className="inline-block h-8 mr-2"
                  />
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Home navigation link */}
              <NavigationMenuItem>
                <NavigationMenuLink href="/">Home</NavigationMenuLink>
              </NavigationMenuItem>

              {/* About navigation link */}
              <NavigationMenuItem>
                <NavigationMenuLink href="/about">About</NavigationMenuLink>
              </NavigationMenuItem>

              {/* Contact navigation link */}
              <NavigationMenuItem>
                <NavigationMenuLink href="/contact">Contact</NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Theme toggle button */}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
