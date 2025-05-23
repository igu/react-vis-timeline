import { difference, each, intersection, keys, omit } from 'lodash';
import React, { Component } from 'react';
import { DataItem, DateType, IdType, TimelineGroup, TimelineItem, TimelineOptions, Timeline as VisTimeline } from 'vis-timeline';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import type { CustomTime, SelectionOptions, TimelineEventsHandlers, TimelineEventsWithMissing } from './models';

const events: TimelineEventsWithMissing[] = [
	'currentTimeTick',
	'click',
	'contextmenu',
	'doubleClick',
	'dragover',
	'drop',
	'mouseOver',
	'mouseDown',
	'mouseUp',
	'mouseMove',
	'groupDragged',
	'changed',
	'rangechange',
	'rangechanged',
	'select',
	'itemover',
	'itemout',
	'timechange',
	'timechanged',
	'markerchange',
	'markerchanged'
];

type Props = {
	initialItems?: TimelineItem[];
	initialGroups?: TimelineGroup[];
	options?: TimelineOptions;
	selection?: IdType[];
	customTimes?: CustomTime[];
	selectionOptions?: SelectionOptions;
	animate?: boolean | {};
	currentTime?: DateType;
} & TimelineEventsHandlers;

export class Timeline extends Component<Props, {}> {
	public timeline: VisTimeline | null = null;

	#ref = React.createRef<HTMLDivElement>();

	override componentWillUnmount() {
		this.timeline?.destroy();
	}

	override componentDidMount() {

		const dataItems: DataItem[] = (this.props.initialItems || []).map(item => ({
			id:      item.id,
			group:   item.group,
			start:   item.start,
			end:     (item as any).end,
			// se for HTMLElement, pega o outerHTML; senão, mantém a string
			content: typeof item.content === 'string'
			  ? item.content
			  : (item.content as HTMLElement).outerHTML,
			type:    (item as any).type,
			// … copie outros campos que precisar
		  }));

		this.timeline = new VisTimeline(
			this.#ref.current,
			dataItems,
			this.props.initialGroups,
			this.props.options
		);
		for (const event of events) {
			const eventHandler = this.props[`${event}Handler`];
			if (typeof eventHandler === 'function') {
				this.timeline.on(event, eventHandler as (properties: any) => void);
			}
		}

		const { options, selection, selectionOptions = {}, customTimes, animate = true, currentTime } = this.props;

		let timelineOptions = options;

		if (animate) {
			// If animate option is set, we should animate the timeline to any new
			// start/end values instead of jumping straight to them
			timelineOptions = omit(options, 'start', 'end');

			this.timeline.setWindow(options.start, options.end, {
				animation: animate
			});
		}

		this.timeline.setOptions(timelineOptions);
		this.updateSelection(selection, selectionOptions);

		if (currentTime) {
			this.timeline.setCurrentTime(currentTime);
		}

		this.updateCustomTimes([], customTimes);
	}

	override shouldComponentUpdate(nextProps: Props) {
		if (this.timeline) {
			const { initialItems, initialGroups, options, selection, customTimes, currentTime } = this.props;
			const itemsChange = initialItems !== nextProps.initialItems;
			const groupsChange = initialGroups !== nextProps.initialGroups;
			const optionsChange = options !== nextProps.options;
			const customTimesChange = customTimes !== nextProps.customTimes;
			const selectionChange = selection !== nextProps.selection;
			const currentTimeChange = currentTime !== nextProps.currentTime;
			if (groupsChange) {
				this.timeline.setGroups(nextProps.initialGroups);
			}
			if (itemsChange) {
				this.timeline.setItems(nextProps.initialItems);
			}
			if (optionsChange) {
				this.timeline.setOptions(nextProps.options);
			}
			if (customTimesChange) {
				this.updateCustomTimes(customTimes, nextProps.customTimes);
			}
			if (selectionChange) {
				this.updateSelection(nextProps.selection, nextProps.selectionOptions);
			}
			if (currentTimeChange) {
				this.timeline.setCurrentTime(nextProps.currentTime);
			}
		}
		return false;
	}

	private updateCustomTimes(prevCustomTimes: CustomTime[], customTimes: CustomTime[]) {
		// diff the custom times to decipher new, removing, updating
		const customTimeKeysPrev = keys(prevCustomTimes);
		const customTimeKeysNew = keys(customTimes);
		const customTimeKeysToAdd = difference(customTimeKeysNew, customTimeKeysPrev);
		const customTimeKeysToRemove = difference(customTimeKeysPrev, customTimeKeysNew);
		const customTimeKeysToUpdate = intersection(customTimeKeysPrev, customTimeKeysNew);
		each(customTimeKeysToRemove, id => this.timeline.removeCustomTime(id));
		each(customTimeKeysToAdd, id => {
			const datetime = customTimes[id].datetime;
			this.timeline.addCustomTime(datetime, id);
		});
		each(customTimeKeysToUpdate, id => {
			const datetime = customTimes[id].datetime;
			this.timeline.setCustomTime(datetime, id);
		});
	}

	private updateSelection(selection: IdType | IdType[], selectionOptions: SelectionOptions): void {
		this.timeline.setSelection(selection, selectionOptions as Required<SelectionOptions>);
	}

	override render() {
		return <div ref={this.#ref} />;
	}
}