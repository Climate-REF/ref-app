import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";

interface BreadcrumbContent {
  url?: string;
  name: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbContent[];
  title: string;
}

function PageHeader({ breadcrumbs, title }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs?.map(({ url, name }: BreadcrumbContent) => (
            <>
              <BreadcrumbItem key={name} className="hidden md:block">
                <BreadcrumbLink href={url ?? "#"}>{name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator
                key={`${url}-sep`}
                className="hidden md:block"
              />
            </>
          ))}
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

export default PageHeader;
