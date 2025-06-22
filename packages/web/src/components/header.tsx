import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { ModeToggle } from '@/components/theme-toggle'
import appLogo from '@/assets/rcube.svg'

export function Header() {
  return (
    <header className="w-full border-b bg-background text-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
        <NavigationMenu className="max-w-full justify-start">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="/" className="font-bold text-lg">
                <img src={appLogo} alt="App Logo" className="inline-block h-8 mr-2" />
              </NavigationMenuLink>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <NavigationMenuLink href="/" >
                Home
              </NavigationMenuLink>
            </NavigationMenuItem>
            

            <NavigationMenuItem>
              <NavigationMenuLink href="/about">
                About
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink href="/contact">
                Contact
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <ModeToggle />
        </div>
      </div>
    </header>
  )
}