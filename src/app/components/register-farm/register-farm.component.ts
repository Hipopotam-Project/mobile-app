import { Component, AfterViewInit } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const mapboxgl: any;
declare const MapboxDraw: any;

@Component({
  selector: 'app-register-farm',
  standalone: true,
  imports: [],
  templateUrl: './register-farm.component.html',
  styleUrl: './register-farm.component.css'
})
export class RegisterFarmComponent implements AfterViewInit {
  private map: any;
  private draw: any;

  ngAfterViewInit(): void {
    this.ensureMapboxAssets()
      .then(() => this.initMap())
      .catch((err) => console.error('Mapbox init failed:', err));
  }

  private initMap() {
    if (!('mapboxgl' in window)) {
      throw new Error('Mapbox GL JS not loaded');
    }

    mapboxgl.accessToken = environment.mapboxToken;

    // Center roughly over Bulgaria (Sofia)
    const center: [number, number] = [23.3219, 42.6977];

    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 6,
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.map.on('load', () => {
      try { this.map.resize(); } catch {}
    });

    // Register custom square mode with touch support and add only Trash control
    const modes = MapboxDraw.modes;
    const updateSquare = function (this: any, state: any, e: any) {
      if (!state.active || !state.startPoint) return;
      const start = this.map.project([state.startPoint.lng, state.startPoint.lat]);
      const current = this.map.project([e.lngLat.lng, e.lngLat.lat]);
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      const end = {
        x: start.x + (dx >= 0 ? side : -side),
        y: start.y + (dy >= 0 ? side : -side),
      };
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const c1 = this.map.unproject({ x: minX, y: minY }); // SW
      const c2 = this.map.unproject({ x: maxX, y: minY }); // SE
      const c3 = this.map.unproject({ x: maxX, y: maxY }); // NE
      const c4 = this.map.unproject({ x: minX, y: maxY }); // NW
      state.polygon.setCoordinates([
        [
          [c1.lng, c1.lat],
          [c2.lng, c2.lat],
          [c3.lng, c3.lat],
          [c4.lng, c4.lat],
          [c1.lng, c1.lat],
        ],
      ]);
    };

    const DrawSquareMode: any = {
      onSetup(this: any) {
        const polygon = this.newFeature({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[]] },
        });
        this.addFeature(polygon);
        this.clearSelectedFeatures();
        this.updateUIClasses({ mouse: 'add' });
        return { polygon, startPoint: null, active: false };
      },
      onMouseDown(this: any, state: any, e: any) {
        state.startPoint = e.lngLat;
        state.active = true;
      },
      onTouchStart(this: any, state: any, e: any) {
        state.startPoint = e.lngLat;
        state.active = true;
      },
      onDrag: updateSquare,
      onMouseMove: updateSquare,
      onTouchMove: updateSquare,
      onMouseUp(this: any, state: any) {
        state.active = false;
        this.changeMode('simple_select', { featureIds: [state.polygon.id] });
      },
      onTouchEnd(this: any, state: any) {
        state.active = false;
        this.changeMode('simple_select', { featureIds: [state.polygon.id] });
      },
      onClick(this: any, state: any, e: any) {
        if (!state.startPoint) {
          state.startPoint = e.lngLat;
          state.active = true;
        } else {
          state.active = false;
          this.changeMode('simple_select', { featureIds: [state.polygon.id] });
        }
      },
      toDisplayFeatures(this: any, _state: any, geojson: any, display: any) {
        display(geojson);
      },
      onStop(this: any, state: any) {
        this.updateUIClasses({ mouse: 'none' });
        if (!state.polygon || !state.polygon.isValid()) {
          if (state.polygon) this.deleteFeature(state.polygon.id, { silent: true });
        }
      },
      onTrash(this: any, state: any) {
        if (state.polygon) this.deleteFeature(state.polygon.id, { silent: true });
        this.changeMode('simple_select');
      },
    };

    modes.draw_square = DrawSquareMode;

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { trash: true },
      modes,
    });

    this.map.addControl(this.draw, 'top-left');

    // Add custom mapbox control button (inside map UI) to draw the square
    const squareControl = this.createButtonControl('□', 'Чертай квадрат', () => {
      this.draw.deleteAll();
      this.draw.changeMode('draw_square');
    });
    this.map.addControl(squareControl as any, 'top-left');

    // Keep only one shape at a time
    this.map.on('draw.create', () => this.keepSingle());
    this.map.on('draw.update', () => this.keepSingle());
  }

  private keepSingle() {
    const data = this.draw.getAll();
    if (data.features.length > 1) {
      const idsToDelete = data.features.slice(0, -1).map((f: any) => f.id);
      this.draw.delete(idsToDelete);
    }
  }

  private createButtonControl(label: string, title: string, onClick: () => void) {
    const self = this;
    return {
      onAdd(_map: any) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = title;
        btn.textContent = label;
        btn.style.fontSize = '18px';
        btn.style.lineHeight = '24px';
        btn.onclick = () => onClick.call(self);
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.appendChild(btn);
        return container;
      },
      onRemove() {},
    };
  }

  private ensureMapboxAssets(): Promise<void> {
    const hasMapbox = (window as any).mapboxgl;
    const hasDraw = (window as any).MapboxDraw;
    if (hasMapbox && hasDraw) return Promise.resolve();

    const promises: Promise<void>[] = [];

    // Prefer stable Mapbox GL JS v2 for better WebView compatibility
    const GL_CSS = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    const GL_JS = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    const DRAW_CSS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.css';
    const DRAW_JS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.js';

    // CSS links
    promises.push(this.injectLink(GL_CSS, 'mapbox-gl-css'));
    promises.push(this.injectLink(DRAW_CSS, 'mapbox-gl-draw-css'));

    // JS scripts (sequential load)
    return Promise.all(promises)
      .then(() => (hasMapbox ? undefined : this.injectScript(GL_JS, 'mapbox-gl-js')))
      .then(() => (hasDraw ? undefined : this.injectScript(DRAW_JS, 'mapbox-gl-draw-js')))
      .then(() => undefined);
  }

  private injectLink(href: string, id: string): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById(id)) return resolve();
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      document.head.appendChild(link);
    });
  }

  private injectScript(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) return resolve();
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });
  }
}
