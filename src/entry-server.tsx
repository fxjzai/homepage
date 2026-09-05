import { renderToString } from 'react-dom/server';
import { loadPage } from './app/App';
import { routes, type Route } from './app/routes';
import { pageHead } from './app/metadata';
import { site } from './content/site';

export { routes, site };

export async function renderPage(route: Route) {
  const Page = await loadPage(route.id);
  return { body: renderToString(<Page />), head: pageHead(route) };
}
