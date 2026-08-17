-- Remove the accidental duplicate Digital Care Records run created today and
-- point the learner back at their completed (archived) run.
delete from simulation_state where project_instance_id = '43600406-87a5-49b2-a372-840adc7f2a47';
delete from inbox_messages where project_instance_id = '43600406-87a5-49b2-a372-840adc7f2a47';
update profiles set current_project_instance_id = '02f927ff-4c60-4a1d-90fd-12ef141f1e20'
 where current_project_instance_id = '43600406-87a5-49b2-a372-840adc7f2a47';
delete from project_instances where id = '43600406-87a5-49b2-a372-840adc7f2a47';