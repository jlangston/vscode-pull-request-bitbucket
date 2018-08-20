/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DiffHunk, DiffChangeType } from '../../common/diffHunk';
import { GitChangeType } from '../../common/file';
import { Resource } from '../../common/resources';
import { IPullRequestModel } from '../../github/interface';
import { TreeNode } from './treeNode';
import { Comment } from '../../common/comment';
import { getDiffLineByPosition, getZeroBased } from '../../common/diffPositionMapping';

export class RemoteFileChangeNode extends TreeNode implements vscode.TreeItem {
	public label: string;
	public iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
	public command: vscode.Command;

	constructor(
		public readonly pullRequest: IPullRequestModel,
		public readonly status: GitChangeType,
		public readonly fileName: string,
		public readonly blobUrl: string
	) {
		super();
		this.label = fileName;
		this.iconPath = Resource.getFileStatusUri(this);

		this.command = {
			title: 'show remote file',
			command: 'vscode.open',
			arguments: [
				vscode.Uri.parse(this.blobUrl)
			]
		};
	}

	getTreeItem(): vscode.TreeItem {
		return this;
	}
}

export class FileChangeNode extends TreeNode implements vscode.TreeItem {
	public label: string;
	public iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
	public resourceUri: vscode.Uri;
	public parentSha: string;
	public contextValue: string;
	public command: vscode.Command;

	constructor(
		public readonly pullRequest: IPullRequestModel,
		public readonly status: GitChangeType,
		public readonly fileName: string,
		public readonly blobUrl: string,
		public readonly filePath: vscode.Uri,
		public readonly parentFilePath: vscode.Uri,
		public readonly isPartial: boolean,
		public readonly diffHunks: DiffHunk[],
		public comments: Comment[] = [],
		public readonly sha?: string,
	) {
		super();
		this.contextValue = 'filechange';
		this.label = fileName;

		if (this.comments && this.comments.length) {
			this.iconPath = Resource.icons.light.Comment;
		} else {
			this.iconPath = Resource.getFileStatusUri(this);
		}
		this.resourceUri = this.filePath;

		let opts: vscode.TextDocumentShowOptions = {
			preserveFocus: true
		};

		if (this.comments && this.comments.length) {
			let sortedActiveComments = this.comments.filter(comment => comment.position).sort((a, b) => {
				return a.position - b.position;
			});

			if (sortedActiveComments.length) {
				let comment = sortedActiveComments[0];
				let diffLine = getDiffLineByPosition(this.diffHunks, comment.position === null ? comment.original_position : comment.position);

				if (diffLine) {
					// If the diff is a deletion, the new line number is invalid so use the old line number. Ensure the line number is positive.
					let lineNumber = Math.max(getZeroBased(diffLine.type === DiffChangeType.Delete ? diffLine.oldLineNumber : diffLine.newLineNumber), 0);
					opts.selection = new vscode.Range(lineNumber, 0, lineNumber, 0);
				}
			}
		}

		this.command = {
			title: 'show diff',
			command: 'vscode.diff',
			arguments: [
				this.parentFilePath,
				this.filePath,
				this.fileName,
				opts
			]
		};
	}

	getTreeItem(): vscode.TreeItem {
		return this;
	}
}

export function fileChangeNodeFilter(nodes: (FileChangeNode | RemoteFileChangeNode)[]): FileChangeNode[] {
	return nodes.filter(node => node instanceof FileChangeNode) as FileChangeNode[];
}