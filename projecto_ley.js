Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
	Meteor.subscribe("tasks");
  // This code only runs on the client

	Template.body.helpers({
		  tasks: function () {
			if (Session.get("hideCompleted")) {
			  // If hide completed is checked, filter tasks
			  return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
			} else {
			  // Otherwise, return all of the tasks
			  return Tasks.find({}, {sort: {createdAt: -1}});
			}
		  },
		  hideCompleted: function () {
			return Session.get("hideCompleted");
		  },
		incompleteCount: function () {
		  return Tasks.find({checked: {$ne: true}}).count();
		}
		}
		

	);

	Template.body.events({
	  "submit .new-task": function (event) {
		// This function is called when the new task form is submitted

		var text = event.target.text.value;

		Meteor.call("addTask", text);


		// Clear form
		event.target.text.value = "";

		// Prevent default form submit
		return false;
	  },
		"change .hide-completed input": function (event) {
  			Session.set("hideCompleted", event.target.checked);
		}
	});



	Template.task.events({
	  "click .toggle-checked": function () {
		// Set the checked property to the opposite of its current value
		Meteor.call("setChecked", this._id, ! this.checked);
	  },
	  "click .delete": function () {
		Meteor.call("deleteTask", this._id)
	  },
		"click .toggle-private": function () {
		  Meteor.call("setPrivate", this._id, ! this.private);
		},
		
		 "submit .new-task2": function (event) {
			var text2 = event.target.text2.value;

			Meteor.call("addComment", this._id, text2);
			event.target.text2.value = "";
			return false;
		},
		"click .edit-mode": function () {
			var temp = this;

			Meteor.call("setEditMode", this._id, ! this.editMode);
		  },

		"click .edit-mode-comment": function (event, template) {
			var taskId = template.data._id;

			Meteor.call("setEditModeComment", taskId, this.numberComment, ! this.editModeComment);
		  },

		"submit .edit-task": function (event) {
			var updatedText = event.target.editedText.value;

			Meteor.call("updateText", this._id, updatedText);
			event.target.editedText.value = "";
			return false;
		},

		"submit .edit-comment": function (event, template) {
			var updatedText = event.target.editedComment.value;
			var taskId = template.data._id;

			Meteor.call("updateTextComment", taskId, this.numberComment, updatedText);

			event.target.editedComment.value = "";
			return false;
		}

	});

	Template.task.helpers({
	  isOwner: function () {
		return this.owner === Meteor.userId();
	  }
	});

	Accounts.ui.config({
	  passwordSignupFields: "USERNAME_ONLY"
	});

}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
	 if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
	 if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
	setPrivate: function (taskId, setToPrivate) {
	  var task = Tasks.findOne(taskId);

	  // Make sure only the task owner can make a task private
	  if (task.owner !== Meteor.userId()) {
		throw new Meteor.Error("not-authorized");
	  }

	  Tasks.update(taskId, { $set: { private: setToPrivate } });
	},

	addComment: function (taskId, comment) {
		var task = Tasks.findOne(taskId);

		if (! Meteor.userId()) {
    	  throw new Meteor.Error("not-authorized");
	    }
		
		var numberComment;
		if(task.comments != undefined){

			numberComment = task.comments.length;
		}
		if(numberComment == undefined){
			numberComment = 0;
		}

		Tasks.update(taskId, { $push: { comments: {
			comment: comment,
		  	createdAt: new Date(),
		  	owner: Meteor.userId(),
		  	username: Meteor.user().username,
			numberComment: numberComment}
		}});
		},
		
	setEditMode: function (taskId, setEditMode) {
		var task = Tasks.findOne(taskId);
		if (task.owner !== Meteor.userId()) {
	      throw new Meteor.Error("not-authorized");
	    }
	    Tasks.update(taskId, { $set: { editMode: setEditMode} });
	},			

	setEditModeComment: function (taskId, numberComment, setEditModeComment) {
		var task = Tasks.findOne(taskId);
		
	    Tasks.update({_id:taskId, "comments.numberComment":numberComment}, { $set: {"comments.$.editModeComment": setEditModeComment}});


	},

	updateText: function (taskId, updatedText) {
		var task = Tasks.findOne(taskId);
		
		if (task.owner !== Meteor.userId()) {
    	  throw new Meteor.Error("not-authorized");
	    }
		
		Tasks.update(taskId, { $set: { text: updatedText } });
		Meteor.call("setEditMode", taskId, false);
		
	},

	updateTextComment: function (taskId, numberComment, updatedComment) {
		var task = Tasks.findOne(taskId);
		
		if (task.owner !== Meteor.userId()) {
    	  throw new Meteor.Error("not-authorized");
	    }
		
		Tasks.update({_id:taskId, "comments.numberComment":numberComment}, { $set: {
			"comments.$.comment": updatedComment,
			"comments.$.editModeComment":false }});
	}
});

if (Meteor.isServer) {


	Meteor.publish("tasks", function () {
	  return Tasks.find({
		$or: [
		  { private: {$ne: true} },
		  { owner: this.userId }
		]
	  });
});
}


